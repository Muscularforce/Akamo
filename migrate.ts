import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://olautjilfmaqnwpnvkqa.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sYXV0amlsZm1hcW53cG52a3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTA4OTgsImV4cCI6MjA5NDE2Njg5OH0.zQ0v04TWtXjDawDyHh5MyrGmw__OVrZws8M5uW8yKDI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDriveToken() {
  const { data, error } = await supabase.functions.invoke('get-drive-token');
  if (error || !data?.accessToken) throw new Error('Failed to get token');
  return data.accessToken;
}

async function uploadToDrive(buffer: ArrayBuffer, name: string, mimeType: string, accessToken: string) {
  const metadata = { name, parents: ['1gVrrtcHtiJuTJpsgvvgl-amY8Pf2Z7ST'] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([buffer], { type: mimeType }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: form
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive upload failed: ${errText}`);
  }
  const data = await res.json();
  
  await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });

  return {
    path: data.id,
    url: `https://drive.google.com/uc?export=download&id=${data.id}`
  };
}

async function migrate() {
  console.log('Starting massive migration from Supabase Storage to Google Drive...');
  
  const { data: tracks, error } = await supabase.from('tracks').select('*');
  if (error) throw error;
  
  console.log(`Found ${tracks.length} tracks to migrate.`);
  
  for (const track of tracks) {
    try {
      console.log(`Migrating track: ${track.title}...`);
      const accessToken = await getDriveToken();

      let newAudioUrl = track.audioUrl;
      let newAudioPath = track.audioPath;
      let newCoverUrl = track.coverUrl;
      let newCoverPath = track.coverPath;

      // Migrate Audio
      if (track.audioUrl && track.audioUrl.includes('supabase.co')) {
        console.log('  -> Downloading audio from Supabase...');
        const audioRes = await fetch(track.audioUrl);
        const audioBuf = await audioRes.arrayBuffer();
        console.log('  -> Uploading audio to Drive...');
        const driveAudio = await uploadToDrive(audioBuf, `migrated-${track.id}.mp3`, 'audio/mpeg', accessToken);
        newAudioUrl = driveAudio.url;
        newAudioPath = driveAudio.path;
      }

      // Migrate Cover
      if (track.coverUrl && track.coverUrl.includes('supabase.co')) {
        console.log('  -> Downloading cover from Supabase...');
        const coverRes = await fetch(track.coverUrl);
        const coverBuf = await coverRes.arrayBuffer();
        console.log('  -> Uploading cover to Drive...');
        const driveCover = await uploadToDrive(coverBuf, `migrated-cover-${track.id}.jpg`, 'image/jpeg', accessToken);
        newCoverUrl = driveCover.url;
        newCoverPath = driveCover.path;
      }

      // Update Database
      const { error: updateError } = await supabase.from('tracks').update({
        audioUrl: newAudioUrl,
        audioPath: newAudioPath,
        coverUrl: newCoverUrl,
        coverPath: newCoverPath
      }).eq('id', track.id);
      
      if (updateError) throw updateError;
      
      console.log(`✅ Successfully migrated ${track.title}`);
      await sleep(1000); 

    } catch (err) {
      console.error(`❌ Failed to migrate ${track.title}:`, err);
    }
  }
  
  console.log('Migration complete!');
}

migrate();
