import {readFile,writeFile,readdir} from 'node:fs/promises';
const assets={};for(const file of await readdir('web')){if(/\.(png|ico)$/.test(file)){assets[file]={base64:(await readFile('web/'+file)).toString('base64'),type:file.endsWith('.ico')?'image/x-icon':'image/png'};}else assets[file]=await readFile('web/'+file,'utf8');}
await writeFile('worker/index.js',(await readFile('web/engine.js','utf8'))+'\n'+(await readFile('web/world.js','utf8'))+'\nconst ASSETS='+JSON.stringify(assets)+';\n'+(await readFile('worker/coop.js','utf8'))+'\n'+await readFile('worker/api.js','utf8'));
