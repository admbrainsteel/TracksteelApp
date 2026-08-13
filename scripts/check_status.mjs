import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.reifonas.cloud';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3Mjk5NTUwMCwiZXhwIjo0OTI4NjY5MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0._n2Kj2f29z1u0pOYUGqAr-1Xjt-xQpK9KDhhhGvOIro';

const sbERP = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });
const sbPub = createClient(supabaseUrl, supabaseKey, { db: { schema: 'public' } });

async function run() {
  let resERP = await sbERP.from('ordens_fabricacao').select('status, num_of');
  let resPub = await sbPub.from('ordens_fabricacao').select('status, num_of');
  
  console.log('--- TS_ERP ---');
  if (resERP.data) {
    console.log(resERP.data);
  } else {
    console.log('no data', resERP.error);
  }
  console.log('--- PUBLIC ---');
  if (resPub.data) {
    console.log(resPub.data);
  } else {
    console.log('no data', resPub.error);
  }
}

run();
