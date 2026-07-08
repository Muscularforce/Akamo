const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCovers() {
  console.log("Fetching tracks with Google Drive covers...");
  
  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('*')
    .like('coverUrl', '%drive.google.com%');

  if (error) {
    console.error("Error fetching tracks:", error);
    return;
  }

  if (!tracks || tracks.length === 0) {
    console.log("No tracks found with Google Drive covers. Migration complete.");
    return;
  }

  console.log(`Found ${tracks.length} tracks to migrate.`);

  // Get Google Drive Token
  const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-drive-token');
  if (tokenError || !tokenData?.accessToken) {
    console.error("Failed to get Google Drive token:", tokenError);
    return;
  }
  const accessToken = tokenData.accessToken;

  for (const track of tracks) {
    try {
      console.log(`\nMigrating track: ${track.title} (${track.id})`);
      
      const match = track.coverUrl.match(/id=([^&]+)/);
      if (!match || !match[1]) {
        console.log(`Could not extract drive ID from ${track.coverUrl}. Skipping.`);
        continue;
      }
      
      const driveId = match[1];
      console.log(`Drive ID: ${driveId}`);

      // Download from Google Drive
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        console.error(`Failed to download from Drive. Status: ${res.status}`);
        const text = await res.text();
        console.error(text);
        continue;
      }

      const buffer = await res.arrayBuffer();
      const mimeType = res.headers.get('content-type') || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      
      const path = `covers/${track.ownerId}-${Date.now()}-migrated.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('songs')
        .upload(path, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) {
        console.error("Upload to Supabase failed:", uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from('songs').getPublicUrl(path);
      const newCoverUrl = publicUrlData.publicUrl;

      // Update Database
      const { error: updateError } = await supabase
        .from('tracks')
        .update({ coverUrl: newCoverUrl, coverPath: path })
        .eq('id', track.id);

      if (updateError) {
        console.error("Database update failed:", updateError);
        continue;
      }

      console.log(`Successfully migrated cover for: ${track.title}`);

    } catch (err) {
      console.error(`Unexpected error migrating ${track.id}:`, err);
    }
  }

  console.log("\nMigration completed successfully.");
}

migrateCovers();
