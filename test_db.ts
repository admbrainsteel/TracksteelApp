import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://supabase.reifonas.cloud', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3Mjk5NTUwMCwiZXhwIjo0OTI4NjY5MTAwLCJyb2xlIjoiYW5vbiJ9.kOAYmQJlNd3LsssUHaNyvWZpa2sunfpLj24F_X-PRNY', { db: { schema: 'TS_ERP' } });
async function run() {
  const { data } = await supabase.from('profiles').select('*').eq('email', 'admtracksteel@gmail.com.br');
  console.log('admtracksteel:', data);
}
run();
