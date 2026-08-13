import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.reifonas.cloud';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3Mjk5NTUwMCwiZXhwIjo0OTI4NjY5MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0._n2Kj2f29z1u0pOYUGqAr-1Xjt-xQpK9KDhhhGvOIro';

const sbERP = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });

async function run() {
  const tables = ['ordens_fabricacao', 'pecas', 'apontamentos_producao'];
  for (let table of tables) {
    let res = await sbERP.from(table).select('*', { count: 'exact', head: true });
    console.log(`TS_ERP.${table}:`, res.count, res.error ? res.error.message : 'OK');
  }
}
run();
