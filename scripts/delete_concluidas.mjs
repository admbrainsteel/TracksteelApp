import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.reifonas.cloud';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3Mjk5NTUwMCwiZXhwIjo0OTI4NjY5MTAwLCJyb2xlIjoic2VydmljZV9yb2xlIn0._n2Kj2f29z1u0pOYUGqAr-1Xjt-xQpK9KDhhhGvOIro';

const sbERP = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });
const sbPub = createClient(supabaseUrl, supabaseKey, { db: { schema: 'public' } });

async function del(table, col, val) {
  if (!val) return;
  let res = await sbERP.from(table).delete().eq(col, val);
  if (res.error && res.error.message.includes("does not exist")) {
    res = await sbPub.from(table).delete().eq(col, val);
  }
}

async function delIn(table, col, vals) {
  if (!vals || vals.length === 0) return;
  let res = await sbERP.from(table).delete().in(col, vals);
  if (res.error && res.error.message.includes("does not exist")) {
    res = await sbPub.from(table).delete().in(col, vals);
  }
}

async function getOF(ofNumber) {
  let res = await sbERP.from('ordens_fabricacao').select('id').eq('num_of', ofNumber).single();
  if (res.error) res = await sbPub.from('ordens_fabricacao').select('id').eq('num_of', ofNumber).single();
  if (res.error) res = await sbERP.from('ofs_concluidas').select('id').eq('of_number', ofNumber).single();
  return res.data ? res.data.id : null;
}

async function getPecas(ofNumber) {
  let res = await sbERP.from('pecas').select('id').eq('of_number', ofNumber);
  if (res.error) res = await sbPub.from('pecas').select('id').eq('of_number', ofNumber);
  return res.data ? res.data.map(p => p.id) : [];
}

async function deleteOF(ofNumber) {
  console.log(`\nIniciando EXCLUSÃO TOTAL da OF: ${ofNumber}`);
  const ofId = await getOF(ofNumber);
  const pecaIds = await getPecas(ofNumber);
  
  if (pecaIds.length > 0) {
    await delIn('itens_romaneio_pecas', 'peca_id', pecaIds);
    await delIn('itens_prioridade_fabricacao', 'peca_id', pecaIds);
    await delIn('processos_pecas_datas', 'peca_id', pecaIds);
  }
  
  await del('logs_apontamentos_automaticos', 'of_number', ofNumber);
  await del('romaneios_expedicao', 'of_number', ofNumber);
  await del('apontamentos_producao', 'of_number', ofNumber);
  await del('apontamentos_diario_recursos', 'of_number', ofNumber);
  await del('prioridades_fabricacao', 'of_number', ofNumber);
  
  if (ofId) await del('cronogramas_of', 'of_id', ofId);
  await del('pecas', 'of_number', ofNumber);
  await del('ordens_fabricacao', 'num_of', ofNumber);
  await del('ofs_concluidas', 'of_number', ofNumber);
  
  console.log(`✅ Fim da rotina para a OF ${ofNumber}.`);
}

async function run() {
  let res = await sbERP.from('ofs_concluidas').select('of_number');
  if (res.error) {
    console.log("TS_ERP failed, trying public...");
    res = await sbPub.from('ofs_concluidas').select('of_number');
  }
  if (res.error) {
    console.error("Erro ao buscar ofs concluidas:", res.error);
    return;
  }
  
  const ofs = res.data.map(r => r.of_number).filter(v => v);
  console.log("OFs concluídas encontradas para deletar:", ofs);
  
  for (const of of ofs) {
    await deleteOF(of);
  }
}
run();
