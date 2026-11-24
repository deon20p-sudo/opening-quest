// Takes Play Store / App Store screenshots of the app with headless Chrome.
//   node tools/serve.mjs 5180   (in another terminal)
//   node tools/store-screenshots.mjs [outdir] [width height scale]
// Default: 412×824 CSS px at 2.625× = 1082×2163 px (9:18, within Play's 2:1 limit).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve(process.argv[2] || 'store/screenshots/phone');
const W = +(process.argv[3] || 412), H = +(process.argv[4] || 824), SCALE = +(process.argv[5] || 2.625);
const URL0 = 'http://localhost:5180/index.html';
mkdirSync(out, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const profile = resolve('build/shot-profile');
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=9333', `--user-data-dir=${profile}`, '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => { const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
const shot = async (name) => { await sleep(500); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${out}/${name}.png`, Buffer.from(r.data, 'base64')); console.log('saved', name); };
const tab = (label) => js(`[...document.querySelectorAll('nav button, .tabbar button')].find(x=>x.textContent.includes(${JSON.stringify(label)})).click(); await new Promise(r=>setTimeout(r,500));`);

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch('http://127.0.0.1:9333/json/list')).json()).find((t) => t.type === 'page'); } catch { /* starting */ }
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
  await new Promise((r) => { ws.onopen = r; });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: true });
  await send('Page.navigate', { url: URL0 }); await sleep(1500);
  // a believable profile for the pictures
  await js(`const k='oq.progress.v1'; const p=JSON.parse(localStorage.getItem(k)||'{}'); p.name='Alex'; p.xp=1840; p.rating=1160; p.streak={days:6,last:new Date().toDateString()};
    p.settings=Object.assign(p.settings||{}, {board:'green', pieces:'cburnett', appearance:'dark', sound:false});
    p.openings=Object.assign(p.openings||{}, {italian:{lesson:true,perfectLesson:true,levels:{1:{stars:3,wins:1},2:{stars:3,wins:1},3:{stars:2,wins:1}},best:3}, 'caro-kann':{lesson:true,levels:{1:{stars:2,wins:1}},best:1}});
    localStorage.setItem(k, JSON.stringify(p));`);
  await send('Page.navigate', { url: URL0 }); await sleep(1800);
  await shot('1-home');
  await tab('Openings'); await shot('2-openings');
  await js(`document.querySelector('.ocard, [class*=card]').click(); await new Promise(r=>setTimeout(r,500)); window.scrollTo(0, 330);`); await shot('3-level-path');
  await js(`window.scrollTo(0,0); document.querySelectorAll('.pcircle')[3].click(); await new Promise(r=>setTimeout(r,500)); [...document.querySelectorAll('.modal button')].find(x=>/Start|Play/.test(x.textContent)).click(); await new Promise(r=>setTimeout(r,2500));`);
  await shot('4-level-game');
  await send('Page.navigate', { url: URL0 }); await sleep(1500);
  await tab('Play'); await shot('5-bots');
  await tab('Analyze');
  await js(`document.querySelector('#pgn').value='[White "Alex"] [Black "Rival"] 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# 0-1'; document.querySelector('#pgnGo').click(); await new Promise(r=>setTimeout(r,12000));`);
  await shot('6-review');
  await send('Page.navigate', { url: URL0 }); await sleep(1500);
  await js(`document.querySelector('.monogram').click(); await new Promise(r=>setTimeout(r,500)); document.querySelector('#themeSlot').scrollIntoView(); window.scrollBy(0,-60);`);
  await shot('7-boards');
  await js(`const k='oq.progress.v1'; const p=JSON.parse(localStorage.getItem(k)); p.settings.appearance='light'; localStorage.setItem(k, JSON.stringify(p));`);
  await send('Page.navigate', { url: URL0 }); await sleep(1500);
  await shot('8-light-mode');
} finally {
  try { ws && ws.close(); } catch { /* ignore */ }
  proc.kill();
}
