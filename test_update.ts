import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://olautjilfmaqnwpnvkqa.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sYXV0amlsZm1hcW53cG52a3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTA4OTgsImV4cCI6MjA5NDE2Njg5OH0.zQ0v04TWtXjDawDyHh5MyrGmw__OVrZws8M5uW8yKDI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Testing update via Supabase Client...');
  const res = await supabase.from('tracks').update({
    audioUrl: 'https://drive.google.com/uc?export=download&id=CLIENT_TEST_ID'
  }).eq('id', '9eef5ae0-4af8-44ae-8eff-28ed061cf0af').select();

  console.log('Response status:', res.status, res.statusText);
  console.log('Response error:', res.error);
  console.log('Response data:', res.data);
}

run();
