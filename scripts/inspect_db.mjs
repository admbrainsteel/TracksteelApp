import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.reifonas.cloud';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3Mjk5NTUwMCwiZXhwIjo0OTI4NjY5MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0._n2Kj2f29z1u0pOYUGqAr-1Xjt-xQpK9KDhhhGvOIro';

const sbERP = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });
const sbPub = createClient(supabaseUrl, supabaseKey, { db: { schema: 'public' } });

async function inspect() {
  console.log("Checking RPCs...");
  // Let's test calling RPC verificar_disponibilidade_peca on TS_ERP and public
  const { data: pecas } = await sbERP.from('pecas').select('id').limit(1);
  if (pecas && pecas[0]) {
    const pecaId = pecas[0].id;
    console.log("Calling rpc on TS_ERP...");
    const resERP = await sbERP.rpc('verificar_disponibilidade_peca', { p_peca_id: pecaId, p_quantidade_adicional: 1 });
    console.log("TS_ERP RPC result:", resERP);

    console.log("Calling rpc on public...");
    const resPub = await sbPub.rpc('verificar_disponibilidade_peca', { p_peca_id: pecaId, p_quantidade_adicional: 1 });
    console.log("public RPC result:", resPub);
  }
}

inspect();
