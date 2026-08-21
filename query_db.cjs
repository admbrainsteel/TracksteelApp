const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: ofData } = await supabase.from('ordens_fabricacao').select('*').eq('num_of', 'B132').single();
    console.log('OF:', ofData);

    const { data: pecas } = await supabase.from('pecas').select('*').eq('of_number', 'B132');
    console.log('Pecas:', pecas);

    const { data: apontamentos } = await supabase.from('apontamentos_producao').select('*').eq('of_number', 'B132');
    console.log('Apt:', apontamentos);
}
main();
