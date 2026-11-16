/** Renderiza los originales vectoriales y las composiciones de las tiendas. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
const require = createRequire(import.meta.url);
const deps = process.env.CODEX_NODE_MODULES || path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const dependency = name => {
  try { return require(name); }
  catch { return require(path.join(deps,name)); }
};
const { chromium } = dependency('playwright');
const sharp = dependency('sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project = path.resolve(root,'..');
const read = p => fs.readFile(path.join(root,p),'utf8');
const put = async (p,s) => { await fs.mkdir(path.dirname(path.join(root,p)),{recursive:true}); await fs.writeFile(path.join(root,p),s); };
const data = (s,m='image/svg+xml') => `data:${m};base64,${Buffer.from(s).toString('base64')}`;
const noi = data(await read('sources/noi/noi-hola.svg'));
const fonts = {
 display: path.join(project,'node_modules/@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf'),
 ui: path.join(project,'node_modules/@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
 heavy: path.join(project,'node_modules/@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf')
};
const fontData = {};
for(const [k,p] of Object.entries(fonts)) fontData[k]=data(await fs.readFile(p),'font/ttf');
const fontCss = Object.entries(fontData).map(([k,v])=>`@font-face{font-family:${k};src:url('${v}')} `).join('');
const svgFonts = `<defs><style>${fontCss}</style></defs>`;
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-sandbox']});
const page = await browser.newPage();
async function render(svg,w,h,dest){
  await page.setViewportSize({width:w,height:h});
  await page.setContent(`<html><head><style>${fontCss}html,body{margin:0;background:#FFE2B8}svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  const buffer = await page.screenshot({type:'png'});
  await sharp(buffer).flatten({background:'#FFFFFF'}).removeAlpha().png().toFile(path.join(root,dest));
}
function scenery(w,h,{night=false}={}){
 return `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${night?'#141936':'#FFF4E1'}"/><stop offset="1" stop-color="${night?'#303A6F':'#FFDCAB'}"/></linearGradient><linearGradient id="land" x2="0" y2="1"><stop stop-color="#73A888"/><stop offset="1" stop-color="#367454"/></linearGradient></defs>
 <rect width="${w}" height="${h}" fill="url(#sky)"/>
 <circle cx="${w*.79}" cy="${h*.24}" r="${h*.19}" fill="${night?'#FCE5B4':'#FFF9EE'}" opacity=".8"/>
 <path d="M0 ${h*.77} L${w*.12} ${h*.5} L${w*.24} ${h*.69} L${w*.43} ${h*.39} L${w*.61} ${h*.69} L${w*.81} ${h*.46} L${w} ${h*.68} V${h}H0Z" fill="#BBCBCD" opacity=".65"/>
 <path d="M0 ${h*.8} Q${w*.08} ${h*.58} ${w*.22} ${h*.8} Q${w*.34} ${h*.96} ${w*.46} ${h*.71} Q${w*.59} ${h*.49} ${w*.73} ${h*.75} L${w} ${h*.58}V${h}H0Z" fill="#90B7A5"/>
 <path d="M0 ${h*.87} Q${w*.15} ${h*.69} ${w*.3} ${h*.87} T${w*.6} ${h*.9} Q${w*.77} ${h*.66} ${w} ${h*.85} V${h}H0Z" fill="url(#land)"/>
 <path d="M${w*.16} ${h*1.04} C${w*.1} ${h*.9},${w*.59} ${h*.9},${w*.49} ${h*.79} S${w*.37} ${h*.74},${w*.42} ${h*.71}" fill="none" stroke="#FFDBA3" stroke-width="${h*.055}" stroke-linecap="round"/>
 <path d="M${w*.16} ${h*1.04} C${w*.1} ${h*.9},${w*.59} ${h*.9},${w*.49} ${h*.79} S${w*.37} ${h*.74},${w*.42} ${h*.71}" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="${h*.003}" stroke-dasharray="${h*.014} ${h*.013}"/>
 ${[.07,.14,.87,.94].map((x,i)=>`<g transform="translate(${w*x} ${h*(.2+i%2*.13)})" opacity=".7"><path d="M0 -${h*.05}V0" stroke="#B87C53" stroke-width="${h*.002}"/><rect x="-${h*.018}" y="0" width="${h*.036}" height="${h*.05}" rx="${h*.012}" fill="#FFB445"/><path d="M0 ${h*.05}v${h*.025}" stroke="#D68A30" stroke-width="${h*.002}"/></g>`).join('')}`;
}
function creative(w,h,kind){
 const isHeader=kind==='header', isFeature=kind==='feature';
 const tx=isHeader?1190:isFeature?80:960;
 const ty=isHeader?825:isFeature?220:1240;
 const font=isHeader?218:isFeature?104:275;
 const nx=isHeader?2090:isFeature?580:2070;
 const ny=isHeader?505:isFeature?45:810;
 const ns=isHeader?640:isFeature?425:900;
 const sub=isHeader?72:isFeature?26:88;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgFonts}${scenery(w,h)}
 <g fill="#1D2347"><text x="${tx}" y="${ty}" font-family="display" font-size="${font}" letter-spacing="-3">Sanuk</text>
 <text x="${tx+4}" y="${ty+sub*1.5}" font-family="heavy" font-size="${sub}">Thai, curva a curva.</text>
 ${isFeature?`<text x="84" y="355" font-family="ui" font-size="24">Aprende tailandés desde el español</text>`:''}</g>
 <image href="${noi}" x="${nx}" y="${ny}" width="${ns}" height="${ns}"/>
 </svg>`;
}
for(const [kind,w,h,dest] of [['header',3840,1646,'apple/creative/header.png'],['search',3840,2560,'apple/creative/search-results.png'],['feature',1024,500,'google-play/feature-graphic.png']]){
 const svg=creative(w,h,kind);
 await put(`sources/${kind}.svg`,svg);
 await render(svg,w,h,dest);
 if(kind!=='feature'){
  const box=kind==='header'?[1097,493,1646,661]:[836,765,2168,1030];
  const guide=svg.replace('</svg>',`<rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="none" stroke="#FF285C" stroke-width="8" stroke-dasharray="20 14"/></svg>`);
  await render(guide,w,h,`checks/${kind}-safe-area.png`);
 }
 console.log(dest);
}
const icon=await fs.readFile(path.join(project,'assets/images/icon.png'));
await sharp(icon).resize(1024,1024).flatten({background:'#FFE2B8'}).removeAlpha().png().toFile(path.join(root,'brand/app-icon-ios-1024.png'));
await sharp(icon).resize(512,512).ensureAlpha().png().toFile(path.join(root,'brand/app-icon-google-512.png'));
for(const [theme,fill,bg] of [['navy','#1D2347',null],['white','#FFFFFF',null],['warm','#1D2347','#FFF4E1']]){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700" viewBox="0 0 1600 700">${svgFonts}${bg?`<rect width="1600" height="700" rx="70" fill="${bg}"/>`:''}<image href="${noi}" x="25" y="25" width="650" height="650"/><text x="680" y="380" fill="${fill}" font-family="display" font-size="280" letter-spacing="-6">Sanuk</text><text x="688" y="485" fill="${fill}" font-family="heavy" font-size="62">Thai, curva a curva.</text></svg>`;
 await put(`brand/logo-${theme}.svg`,svg);
 await page.setViewportSize({width:1600,height:700});
 await page.setContent(`<html><head><style>${fontCss}html,body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`);
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(root,`brand/logo-${theme}.png`),omitBackground:!bg});
}
await put('brand/brand-notes.txt',`Sanuk · Thai, curva a curva.\n\nColor principal #1D2347\nAzafrán #FFA41B\nArrozal #13854F\nFarol #FF6A3D\nAlba #FFE2B8\nNiebla #F3F6FA\n\nFredoka para titulares, Nunito para texto y Noto Sans Thai Looped para tailandés. Fuentes del proyecto con licencia OFL. No estirar el logotipo ni recortar a Noi. Usar la variante navy sobre fondos claros y white sobre fondos oscuros.\nLos SVG incluyen las fuentes en su interior para conservar el aspecto y permiten editar los elementos.\n`);
await browser.close();
