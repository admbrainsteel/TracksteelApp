import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.reifonas.cloud';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3Mjk5NTUwMCwiZXhwIjo0OTI4NjY5MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0._n2Kj2f29z1u0pOYUGqAr-1Xjt-xQpK9KDhhhGvOIro';

const sbERP = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });

async function run() {
  let { data, error, count } = await sbERP.from('ordens_fabricacao').select('*', { count: 'exact' });
  console.log('All OFs in TS_ERP:', count, error ? error : `First row: ${JSON.stringify(data[0])}`);
}

run();
