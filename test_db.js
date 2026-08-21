import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL="(.*?)"/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*?)"/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: ofData } = await supabase.from('ordens_fabricacao').select('*').eq('num_of', 'B132').single();
    console.log('OF:', ofData.peso_total);
    const { data: pecas } = await supabase.from('pecas').select('peso_unitario, quantidade').eq('of_number', 'B132');
    console.log('Pecas:', pecas.length > 0 ? pecas[0] : null);
}
main();
