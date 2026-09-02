const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=\"(.*?)\"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"(.*?)\"/)[1];
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });

async function run() {
  const pecasParaInserir = [{
    of_number: 'B133',
    etapa_fase: '1',
    marca: 'M1',
    descricao: 'Desc M1',
    quantidade: 1,
    peso_unitario: 10,
    peso_total: 10,
    tratamento_superficial: 'pintura',
    material: 'A36',
    perfil_principal: 'C',
    tem_componentes: false,
    user_id: '00000000-0000-0000-0000-000000000000', // invalid uuid? maybe this fails?
    prioridade: 'P4'
  }];
  
  const { data, error } = await supabase
    .from('pecas')
    .insert(pecasParaInserir)
    .select('id, of_number, etapa_fase, marca');
    
  console.log('Result:', JSON.stringify({ data, error }, null, 2));
}
run();
