const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=\"(.*?)\"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=\"(.*?)\"/)[1];
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'TS_ERP' } });

async function run() {
  const { data: existingFicha } = await supabase
    .from('ficha_tecnica_contratos')
    .select('id')
    .eq('of_number', 'B133')
    .maybeSingle();

  if (existingFicha) {
    const { data, error } = await supabase
      .from('ficha_tecnica_contratos')
      .update({ quantidade: 2 })
      .eq('id', existingFicha.id);
    console.log('Update result:', { data, error });
  } else {
    console.log('No ficha found for B133');
  }
}
run();
