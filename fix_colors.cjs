const fs = require('fs');
let code = fs.readFileSync('src/pages/Visualizador3D.tsx', 'utf8');

// Darken backgrounds to solid white
code = code.replace(/bg-white\/90/g, 'bg-white');
code = code.replace(/bg-white\/80/g, 'bg-white');
code = code.replace(/bg-slate-50\/80/g, 'bg-slate-100');
code = code.replace(/bg-slate-50/g, 'bg-slate-100');

// Darken texts
code = code.replace(/text-slate-800/g, 'text-slate-900');
code = code.replace(/text-slate-500 dark:text-slate-400/g, 'text-slate-700 font-bold dark:text-slate-300 dark:font-medium');
code = code.replace(/text-slate-600/g, 'text-slate-800 font-medium');

fs.writeFileSync('src/pages/Visualizador3D.tsx', code);
