import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="(.*?)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: ofData } = await supabase.from('ordens_fabricacao').select('*').limit(3);
    console.log('OFs:', ofData.map(o => ({ num_of: o.num_of, peso_total: o.peso_total })));

    const { data: pecas } = await supabase.from('pecas').select('of_number, peso_unitario, peso_total, quantidade').limit(3);
    console.log('Pecas:', pecas);
}
main();
