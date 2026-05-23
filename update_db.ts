import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://olautjilfmaqnwpnvkqa.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sYXV0amlsZm1hcW53cG52a3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTA4OTgsImV4cCI6MjA5NDE2Njg5OH0.zQ0v04TWtXjDawDyHh5MyrGmw__OVrZws8M5uW8yKDI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getDriveToken() {
  const { data, error } = await supabase.functions.invoke('get-drive-token');
  if (error || !data?.accessToken) throw new Error('Failed to get Google Drive access token from Supabase Edge Function.');
  return data.accessToken;
}

async function listDriveFiles(accessToken: string) {
  const folderId = '1gVrrtcHtiJuTJpsgvvgl-amY8Pf2Z7ST';
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&pageSize=1000&fields=files(id,name)`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list Google Drive files: ${errText}`);
  }
  const data = await res.json();
  return data.files || [];
}

async function updateDb() {
  try {
    console.log('🔄 Fetching Google Drive access token...');
    const accessToken = await getDriveToken();

    console.log('📂 Fetching migrated files from Google Drive...');
    const files = await listDriveFiles(accessToken);
    console.log(`Found ${files.length} files in Google Drive folder.`);

    // Map to group files by track UUID
    // Filename formats:
    // migrated-{trackId}.mp3
    // migrated-cover-{trackId}.jpg
    interface TrackFiles {
      audioId?: string;
      coverId?: string;
    }
    const trackMap = new Map<string, TrackFiles>();

    for (const file of files) {
      if (file.name.startsWith('migrated-cover-')) {
        // e.g. migrated-cover-12345.jpg -> trackId = 12345
        const parts = file.name.replace('migrated-cover-', '').split('.');
        const trackId = parts[0];
        if (trackId) {
          const current = trackMap.get(trackId) || {};
          current.coverId = file.id;
          trackMap.set(trackId, current);
        }
      } else if (file.name.startsWith('migrated-')) {
        // e.g. migrated-12345.mp3 -> trackId = 12345
        const parts = file.name.replace('migrated-', '').split('.');
        const trackId = parts[0];
        if (trackId) {
          const current = trackMap.get(trackId) || {};
          current.audioId = file.id;
          trackMap.set(trackId, current);
        }
      }
    }

    console.log(`Parsed ${trackMap.size} tracks from Google Drive filenames.`);

    console.log('⚡ Updating Supabase database rows...');
    let successCount = 0;
    for (const [trackId, data] of trackMap.entries()) {
      const updates: any = {};
      if (data.audioId) {
        updates.audioUrl = `https://olautjilfmaqnwpnvkqa.supabase.co/functions/v1/stream-track?id=${data.audioId}`;
        updates.audioPath = data.audioId;
      }
      if (data.coverId) {
        updates.coverUrl = `https://drive.google.com/thumbnail?id=${data.coverId}&sz=w1000`;
        updates.coverPath = data.coverId;
      }

      if (Object.keys(updates).length > 0) {
        const { data: updatedRows, error: updateError } = await supabase
          .from('tracks')
          .update(updates)
          .eq('id', trackId)
          .select();

        if (updateError) {
          console.error(`❌ Failed to update track ${trackId}:`, updateError.message);
        } else if (updatedRows && updatedRows.length > 0) {
          console.log(`✅ Updated database track: "${updatedRows[0].title}" (ID: ${trackId})`);
          successCount++;
        } else {
          console.log(`⚠️ Database row not found for ID: ${trackId} (Skipped)`);
        }
      }
    }

    console.log(`🎉 Finished! Successfully updated ${successCount} tracks in Supabase database.`);

  } catch (err: any) {
    console.error('❌ Error during database updates:', err.message);
  }
}

updateDb();
