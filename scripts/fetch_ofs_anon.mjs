import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.reifonas.cloud';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3Mjk5NTUwMCwiZXhwIjo0OTI4NjY5MTAwLCJyb2xlIjoiYW5vbiJ9.kOAYmQJlNd3LsssUHaNyvWZpa2sunfpLj24F_X-PRNY';

const sbERP = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });

async function run() {
  const { data, error } = await sbERP.from('ordens_fabricacao').select('id, num_of, status');
  console.log('--- anon key ---');
  console.log(data);
  console.log(error);
}

run();
