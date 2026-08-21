import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.reifonas.cloud';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3Mjk5NTUwMCwiZXhwIjo0OTI4NjY5MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0._n2Kj2f29z1u0pOYUGqAr-1Xjt-xQpK9KDhhhGvOIro';

const sbERP = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });

async function check() {
  console.log("Testing insert into itens_prioridade_fabricacao...");
  
  const { data: pecas } = await sbERP.from('pecas').select('id, of_number, etapa_fase').limit(1);
  const { data: prios } = await sbERP.from('prioridades_fabricacao').select('id').limit(1);
  
  console.log("Peca:", pecas);
  console.log("Prioridade:", prios);
  
  if (pecas && pecas[0] && prios && prios[0]) {
    const { data, error } = await sbERP.from('itens_prioridade_fabricacao').insert([{
      prioridade_fabricacao_id: prios[0].id,
      peca_id: pecas[0].id,
      quantidade_priorizada: 1,
      peso_total: 10,
      ordem_fabricacao: 1
    }]).select();
    
    console.log("Insert result:", { data, error });
  }
}

check();
