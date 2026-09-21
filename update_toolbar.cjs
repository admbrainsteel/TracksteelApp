const fs = require('fs');
let code = fs.readFileSync('src/components/viewer3d/Viewer3DToolbar.tsx', 'utf8');

// Global replacements for light mode
code = code.replace(/bg-slate-900\/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl text-slate-200/g, 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl text-slate-700 dark:text-slate-200');

code = code.replace(/bg-slate-950\/60/g, 'bg-slate-50/80 dark:bg-slate-950/60');
code = code.replace(/border-slate-800/g, 'border-slate-200 dark:border-slate-800');
code = code.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-400');
code = code.replace(/text-slate-300/g, 'text-slate-600 dark:text-slate-300');
code = code.replace(/hover:text-slate-200/g, 'hover:text-slate-800 dark:hover:text-slate-200');
code = code.replace(/hover:bg-slate-800\/60/g, 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60');
code = code.replace(/bg-slate-700/g, 'bg-slate-200 dark:bg-slate-700');

// Specific button active states
code = code.replace(/bg-cyan-500\/20 text-cyan-300 border border-cyan-500\/40/g, 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40');
code = code.replace(/bg-rose-500\/20 text-rose-300 border border-rose-500\/40/g, 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40');
code = code.replace(/bg-blue-500\/20 text-blue-300 border border-blue-500\/40/g, 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40');
code = code.replace(/bg-emerald-500\/20 text-emerald-300 border border-emerald-500\/40/g, 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40');
code = code.replace(/bg-amber-500\/20 text-amber-300 border border-amber-500\/40/g, 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40');

code = code.replace(/bg-amber-500 text-slate-950/g, 'bg-amber-500 text-white dark:text-slate-950');
code = code.replace(/bg-emerald-500 text-slate-950/g, 'bg-emerald-500 text-white dark:text-slate-950');

code = code.replace(/hover:bg-cyan-500 hover:text-slate-950/g, 'hover:bg-cyan-100 dark:hover:bg-cyan-500 hover:text-cyan-700 dark:hover:text-slate-950');

fs.writeFileSync('src/components/viewer3d/Viewer3DToolbar.tsx', code);

// Fix ModelViewer3D grid color
let mvCode = fs.readFileSync('src/components/viewer3d/ModelViewer3D.tsx', 'utf8');
mvCode = mvCode.replace(/new THREE.GridHelper\(1000, 100, 0x475569, 0x334155\)/g, 'new THREE.GridHelper(1000, 100, 0x94a3b8, 0x94a3b8)');
fs.writeFileSync('src/components/viewer3d/ModelViewer3D.tsx', mvCode);

