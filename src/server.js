import http from "node:http";
import net from "node:net";
import { URL } from "node:url";

const HTTP_PORT = Number(process.env.HTTP_PORT || process.env.PORT || 8080);
const VT_PORT = Number(process.env.VT_PORT || 2323);
const TN5250_PORT = Number(process.env.TN5250_PORT || 25250);
const TN3270_PORT = Number(process.env.TN3270_PORT || 23270);
const HOST = process.env.HOST || "0.0.0.0";
const RAW_TCP_ENABLED = parseBool(
  process.env.ENABLE_RAW_TCP,
  !process.env.RAILWAY_PROJECT_ID && !process.env.RAILWAY_ENVIRONMENT_ID
);

export function createHttpServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/health") return sendJson(res, 200, { ok: true, service: "newland-eb-demo-host" });
    if (url.pathname === "/config-samples") return sendJson(res, 200, configSamples(req.headers.host || "localhost"));
    if (url.pathname === "/host-profiles.json") return sendJson(res, 200, hostProfiles(req.headers.host || "localhost"));
    if (url.pathname === "/assets/app.js") return sendText(res, 200, "application/javascript; charset=utf-8", clientJs());
    if (url.pathname === "/assets/style.css") return sendText(res, 200, "text/css; charset=utf-8", css());
    return sendText(res, 200, "text/html; charset=utf-8", html());
  });
}

export function createVtServer() {
  return net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.setNoDelay(true);
    const session = new VtSession(socket);
    session.start();
  });
}

export function createTn5250Server() {
  return net.createServer((socket) => {
    socket.setNoDelay(true);
    const session = new Tn5250DemoSession(socket);
    session.start();
  });
}

export function createTn3270Server() {
  return net.createServer((socket) => {
    socket.setNoDelay(true);
    const session = new Tn3270DemoSession(socket);
    session.start();
  });
}

function sendJson(res, status, body) {
  sendText(res, status, "application/json; charset=utf-8", JSON.stringify(body, null, 2));
}

function sendText(res, status, type, body) {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}

function configSamples(hostHeader) {
  const host = hostHeader.split(":")[0];
  return hostProfiles(hostHeader);
}

function hostProfiles(hostHeader) {
  const host = hostHeader.split(":")[0];
  const webUrl = host.includes("localhost") || /^\d+\.\d+\.\d+\.\d+$/.test(host)
    ? `http://${host}:${HTTP_PORT}`
    : `https://${host}`;
  const teProfiles = RAW_TCP_ENABLED ? [
    {
      name: "Newland EB VT100/VT220 Demo",
      protocol: "VT100",
      transport: "PLAIN_TCP",
      host,
      port: VT_PORT,
      rows: 24,
      cols: 80,
      autoScanEnter: true
    },
    {
      name: "Newland EB TN5250 Demo",
      protocol: "TN5250",
      transport: "PLAIN_TCP",
      host,
      port: TN5250_PORT,
      codepage: "CP037",
      rows: 24,
      cols: 80,
      deviceType: "IBM-3477-FC",
      autoScanEnter: false,
      forceUpperCase: true,
      fieldExitOnFull: true
    },
    {
      name: "Newland EB TN3270 Demo",
      protocol: "TN3270",
      transport: "PLAIN_TCP",
      host,
      port: TN3270_PORT,
      codepage: "CP037",
      rows: 24,
      cols: 80,
      deviceType: "IBM-3278-2",
      autoScanEnter: false,
      forceUpperCase: true
    }
  ] : [];
  return {
    capabilities: {
      web: true,
      rawTcp: RAW_TCP_ENABLED,
      note: RAW_TCP_ENABLED
        ? "Web, VT100/VT220, TN5250, and TN3270 demo listeners are enabled."
        : "This deployment exposes Web only. Use Oracle/VPS/local host for raw TCP terminal demos."
    },
    webProfiles: [
      {
        name: "Newland EB Web Demo",
        url: webUrl,
        keyboardMode: "NEWLAND"
      }
    ],
    teProfiles,
    unsupportedTemplates: {
      vtSsh: {
        name: "Newland EB VT SSH Template",
        protocol: "VT100",
        transport: "SSH",
        host,
        port: 22,
        rows: 24,
        cols: 80,
        sshUser: "operator",
        credentialAlias: "demo-ssh",
        knownHostsContent: "paste production known_hosts here"
      },
      tn5250Tls: {
        name: "Newland EB TN5250 TLS Template",
        protocol: "TN5250",
        transport: "TLS",
        host,
        port: 992,
        codepage: "CP037",
        rows: 24,
        cols: 80,
        deviceType: "IBM-3477-FC"
      }
    },
    legacyAliases: {
      webProfile: { name: "Newland EB Web Demo", url: webUrl },
      vtProfile: {
      name: "Newland EB VT Demo",
      protocol: "VT100",
      transport: "PLAIN_TCP",
      host,
      port: VT_PORT,
      rows: 24,
      cols: 80,
      autoScanEnter: true
      }
    }
  };
}

function html() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Newland EB Demo Host</title>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <header>
    <div class="brand">Newland EB Demo Host</div>
    <div class="status">HTTP Web Workflow</div>
  </header>
  <main id="app" class="screen"></main>
  <nav>
    <button data-action="login">Login</button>
    <button data-action="outbound">Outbound</button>
    <button data-action="inbound">Inbound</button>
    <button data-action="inventory">Inventory</button>
    <button data-action="printTest">Print Test</button>
    <button data-action="zoom">Small Screen</button>
    <button data-action="profiles">Profiles</button>
  </nav>
  <script src="/assets/app.js"></script>
</body>
</html>`;
}

function css() {
  return `:root{font-family:Arial,Helvetica,sans-serif;color:#edf3f8;background:#101418}body{margin:0;background:#101418}header{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:16px 18px;background:#17202b;border-bottom:1px solid #273244}.brand{font-size:22px;font-weight:700}.status{color:#7dd3fc;font-size:14px}.screen{padding:18px;max-width:760px;margin:0 auto}.panel{border:1px solid #2c3848;border-radius:8px;background:#151b24;padding:16px;margin-bottom:14px}.title{font-size:24px;font-weight:800;color:#facc15;margin:0 0 14px}.row{margin:14px 0}label{display:block;color:#facc15;font-size:13px;font-weight:700;text-transform:uppercase;margin-bottom:7px}input,select,textarea{box-sizing:border-box;width:100%;font-size:22px;padding:14px 16px;border:2px solid #334155;border-radius:8px;background:#0f141c;color:#f8fafc}textarea{font-size:13px;min-height:168px;line-height:1.35}input:focus,textarea:focus{outline:none;border-color:#facc15}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}button{font-size:18px;font-weight:700;padding:12px 14px;border:0;border-radius:8px;background:#2563eb;color:white}button.secondary{background:#334155}.ok{color:#4ade80}.warn{color:#facc15}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.tiny{font-size:12px;line-height:1.25}.zoomed .tiny{font-size:22px;line-height:1.38}.zoomed .mono{font-size:20px;white-space:normal;word-break:break-word}nav{display:flex;flex-wrap:wrap;gap:6px;padding:10px 18px 16px;background:#0b1017;border-top:1px solid #273244}nav button{flex:1 1 30%;font-size:13px;padding:10px 6px;background:#17202b}`;
}

function clientJs() {
  return `
const app=document.getElementById('app');
let state={user:'',task:'',loc:'',item:'',pallet:''};
function q(s){return document.querySelector(s)}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function focusFirst(){setTimeout(()=>{const el=document.querySelector('input:not([readonly])');if(el)el.focus()},50)}
function field(id,label,type='text',scan=false,value=''){return '<div class="row"><label for="'+id+'">'+label+'</label><input id="'+id+'" '+(scan?'data-scan="true" inputmode="none"':'')+' type="'+type+'" value="'+esc(value)+'" autocomplete="off"></div>'}
function page(title,body){app.innerHTML='<section class="panel"><h1 class="title">'+title+'</h1>'+body+'</section>';bindEnter();focusFirst()}
function bindEnter(){app.querySelectorAll('input').forEach((el,i,all)=>{el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const next=all[i+1];if(next){next.focus();return}submitCurrent()}})})}
function bridgeAvailable(){return !!(window.Android&&(typeof Android.printRaw==='function'||typeof Android.printCpcl==='function'||typeof Android.printZpl==='function'))}
function option(value,label,selected=false){return '<option value="'+value+'" '+(selected?'selected':'')+'>'+label+'</option>'}
function selectField(id,label,options){return '<div class="row"><label for="'+id+'">'+label+'</label><select id="'+id+'">'+options+'</select></div>'}
function bluetoothPrinterSelect(){return '<div id="btBlock" class="row" style="display:none"><label for="btPrinter">Bluetooth printer</label><select id="btPrinter"><option value="">Scan for nearby printers first</option></select><div class="actions"><button type="button" onclick="scanBluetoothPrinters()">Scan Printers</button><button type="button" class="secondary" onclick="testBluetoothPrinter()">Connect Test</button><button type="button" class="secondary" onclick="stopBluetoothPrinterScan()">Stop Scan</button></div></div>'}
function demoCpcl(labelId,item,qty){return '! 0 200 200 360 1\\nCENTER\\nTEXT 4 0 0 20 Newland EB Print Test\\nBARCODE 128 1 1 90 40 70 '+labelId+'\\nTEXT 4 0 40 190 Item: '+item+'\\nTEXT 4 0 40 235 Qty: '+qty+'\\nTEXT 7 0 40 295 CPCL / Railway demo host\\nFORM\\nPRINT\\n'}
function demoEscPos(labelId,item,qty){return '\\x1B@Newland EB Print Test\\n------------------------\\nLabel: '+labelId+'\\nItem : '+item+'\\nQty  : '+qty+'\\n\\nESC/POS receipt test\\n\\n\\x1DVA\\x00'}
window.login=()=>page('Login',field('user','User')+field('pass','Password','password')+'<div class="actions"><button onclick="submitCurrent()">Sign in</button></div>');
window.submitLogin=()=>{state.user=q('#user')?.value||'operator';outbound()};
window.outbound=()=>page('Outbound Picking',field('task','Scan Task #','text',true)+'<div class="actions"><button onclick="submitCurrent()">Continue</button></div>');
window.submitOutbound=()=>{state.task=q('#task')?.value||'TASK-1001';page('Pick Task '+state.task,field('loc','Scan Location','text',true)+field('item','Scan Item','text',true)+field('qty','Qty Picked','number')+'<div class="actions"><button onclick="submitCurrent()">Confirm</button></div>')};
window.submitPick=()=>page('Pick Confirmed','<p class="ok">Task '+state.task+' confirmed.</p><p>Returning to menu style workflows should not require extra navigation after scan confirmation.</p><div class="actions"><button onclick="outbound()">Next Pick</button><button class="secondary" onclick="inventory()">Inventory</button></div>');
window.inbound=()=>page('Inbound Putaway',field('pallet','Scan Pallet','text',true)+field('dest','Scan Destination','text',true)+'<div class="actions"><button onclick="submitCurrent()">Confirm</button></div>');
window.submitInbound=()=>page('Putaway Complete','<p class="ok">Pallet putaway confirmed.</p><div class="actions"><button onclick="inbound()">Next Pallet</button></div>');
window.inventory=()=>page('Inventory Lookup',field('sku','Scan Item / SKU','text',true)+'<div class="actions"><button onclick="submitCurrent()">Lookup</button></div>');
window.submitInventory=()=>page('Inventory Result','<p class="mono">Item: '+(q('#sku')?.value||'ITEM-001')+'</p><p>On hand: <b>127</b></p><p>Locations: A-12-03-B, A-15-07-C</p><div class="actions"><button onclick="inventory()">Lookup Another</button></div>');
window.printTest=()=>{const id='LBL-'+Date.now().toString().slice(-6);const body='<p>This page validates Newland EB JS Bridge raw printing. Select a connection type first, then the command language. Newland PP310 should normally use CPCL for labels or ESC/POS for receipts.</p><p id="bridgeStatus" class="'+(bridgeAvailable()?'ok':'warn')+'">'+(bridgeAvailable()?'Newland EB Bridge detected':'Open this page inside Newland EB to print')+'</p>'+selectField('printerType','Printer type',option('TCP','Network TCP / Raw Port',true)+option('BLUETOOTH_SPP','Bluetooth SPP'))+selectField('language','Command language',option('CPCL','CPCL label',true)+option('ESC_POS','ESC/POS receipt')+option('RAW','RAW command'))+'<div id="tcpBlock">'+field('printer','Network address','text',false,'')+'</div>'+bluetoothPrinterSelect()+field('labelId','Label ID','text',true,id)+field('item','Item','text',true,'WIDGET-001')+field('qty','Quantity','number',false,'12')+'<div class="row"><label for="command">Command Preview</label><textarea id="command" class="mono"></textarea></div><p id="printResult" class="mono tiny">Waiting for print action.</p><div class="actions"><button onclick="refreshPrintCommand()">Refresh Command</button><button onclick="printDefault()">Print Default</button><button class="secondary" onclick="printSelected()">Print Selected</button></div>';page('Print Test',body);q('#printerType').addEventListener('change',updatePrinterFlow);q('#language').addEventListener('change',refreshPrintCommand);updatePrinterFlow();refreshPrintCommand()};
window.updatePrinterFlow=()=>{const type=q('#printerType')?.value||'TCP';const tcp=q('#tcpBlock');const bt=q('#btBlock');if(tcp)tcp.style.display=type==='TCP'?'block':'none';if(bt)bt.style.display=type==='BLUETOOTH_SPP'?'block':'none';const p=q('#printer');if(p)p.placeholder='192.168.1.100:9100';const r=q('#printResult');if(r&&type==='BLUETOOTH_SPP'){r.className='mono tiny';r.textContent='Tap Scan Printers. Choose a discovered printer, then Connect Test. The MAC address is filled from discovery.';refreshBluetoothPrinters()}else if(r){r.className='mono tiny';r.textContent='Network TCP can print now. Enter raw-port address such as 192.168.1.100:9100.'}};
window.renderBluetoothPrinters=(devices)=>{const sel=q('#btPrinter');if(!sel)return;if(!devices.length){sel.innerHTML='<option value="">No Bluetooth printers found yet</option>';return}sel.innerHTML=devices.map(d=>'<option value="'+esc(d.address)+'">'+esc((d.name||d.address)+' · '+d.address+(d.bonded?' · paired':'')+(d.supportsSpp?' · SPP':' · unknown'))+'</option>').join('')};
window.refreshBluetoothPrinters=()=>{const sel=q('#btPrinter');if(!sel)return;if(!(window.Android&&typeof Android.getBluetoothPrinters==='function')){sel.innerHTML='<option value="">Newland EB Bluetooth Bridge not available</option>';return}let devices=[];try{devices=JSON.parse(Android.getBluetoothPrinters()||'[]')}catch(e){}renderBluetoothPrinters(devices)};
window.scanBluetoothPrinters=()=>{if(!(window.Android&&typeof Android.startBluetoothPrinterScan==='function')){onBluetoothPrinterScan(false,'Newland EB Bluetooth scan Bridge not available',[]);return}const ok=Android.startBluetoothPrinterScan(12000);if(!ok)onBluetoothPrinterScan(false,'Bluetooth scan was not started',[])};
window.stopBluetoothPrinterScan=()=>{if(window.Android&&typeof Android.stopBluetoothPrinterScan==='function')Android.stopBluetoothPrinterScan()};
window.onBluetoothPrinterScan=(scanning,error,devices)=>{renderBluetoothPrinters(Array.isArray(devices)?devices:[]);const el=q('#printResult');if(el){el.className=error?'warn mono tiny':'mono tiny';el.textContent=error?'Bluetooth scan: '+error:(scanning?'Scanning nearby Bluetooth printers...':'Bluetooth scan complete. Select a printer and run Connect Test.')}};
window.testBluetoothPrinter=()=>{const address=q('#btPrinter')?.value||'';if(!address){onBluetoothPrinterResult(false,'Scan and select a Bluetooth printer first','');return}if(!(window.Android&&typeof Android.testBluetoothPrinter==='function')){onBluetoothPrinterResult(false,'Newland EB Bluetooth Bridge not available',address);return}const ok=Android.testBluetoothPrinter(address);if(!ok)onBluetoothPrinterResult(false,'Connect test was rejected',address)};
window.onBluetoothPrinterResult=(success,error,address)=>{const el=q('#printResult');if(el){el.className=success?'ok mono tiny':'warn mono tiny';el.textContent=success?'Bluetooth SPP connected. MAC: '+address:'Bluetooth connect failed: '+(error||'unknown error')}};
window.refreshPrintCommand=()=>{const lang=q('#language')?.value||'CPCL';const id=q('#labelId')?.value||'LBL-DEMO';const item=q('#item')?.value||'WIDGET-001';const qty=q('#qty')?.value||'1';let cmd=lang==='ESC_POS'?demoEscPos(id,item,qty):demoCpcl(id,item,qty);if(lang==='RAW')cmd='RAW TEST '+id+' '+item+' QTY '+qty+'\\n';const el=q('#command');if(el)el.value=cmd};
window.onPrintResult=(success,error)=>{const el=q('#printResult');if(el){el.className=success?'ok mono tiny':'warn mono tiny';el.textContent=success?'Print accepted by Newland EB':'Print failed: '+(error||'unknown error')}};
window.printDefault=()=>{refreshPrintCommand();if(!bridgeAvailable()){onPrintResult(false,'Newland EB JS Bridge not available');return}const lang=q('#language')?.value||'CPCL';let ok=false;if(typeof Android.printRaw==='function')ok=Android.printRaw(lang,q('#command').value);else if(lang==='CPCL'&&typeof Android.printCpcl==='function')ok=Android.printCpcl(q('#command').value);else if(lang==='ESC_POS'&&typeof Android.printEscPos==='function')ok=Android.printEscPos(q('#command').value);else ok=Android.printZpl(q('#command').value);if(!ok)onPrintResult(false,'Print command was rejected')};
window.printSelected=()=>{refreshPrintCommand();if(!bridgeAvailable()){onPrintResult(false,'Newland EB JS Bridge not available');return}const type=q('#printerType')?.value||'TCP';const address=type==='BLUETOOTH_SPP'?(q('#btPrinter')?.value||''):(q('#printer')?.value||'').trim();const lang=q('#language')?.value||'CPCL';if(!address){onPrintResult(false,type==='TCP'?'Enter printer address such as 192.168.1.100:9100':'Scan and select a Bluetooth printer first');return}const ok=typeof Android.printRawTo==='function'?Android.printRawTo(type,address,lang,q('#command').value):Android.printZplTo(address,q('#command').value);if(!ok)onPrintResult(false,'Print command was rejected')};
window.zoom=()=>page('Small Server Screen','<div class="tiny"><p>This page intentionally uses small dense text to validate Newland EB zoom and handheld readability behavior.</p><p class="mono">PO 4500098821 | SKU WIDGET-001 | BIN A-12-03-B | QTY 000127 | STATUS READY</p><p class="mono">Use browser zoom or Newland EB controls to enlarge legacy desktop-style screens.</p></div><div class="actions"><button onclick="app.classList.toggle(\\'zoomed\\')">Toggle Page Zoom</button></div>');
window.profiles=async()=>{const res=await fetch('/host-profiles.json');const body=await res.json();page('Host Profile Samples','<p>Use these profiles to validate Web, VT100/VT220, TN5250 and TN3270 entry points.</p><pre class="mono tiny">'+esc(JSON.stringify(body,null,2))+'</pre>')};
function submitCurrent(){const title=app.querySelector('.title')?.textContent||'';if(title==='Login')submitLogin();else if(title==='Outbound Picking')submitOutbound();else if(title.startsWith('Pick Task'))submitPick();else if(title==='Inbound Putaway')submitInbound();else if(title==='Inventory Lookup')submitInventory()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>window[b.dataset.action]());
login();
`;
}

class VtSession {
  constructor(socket) {
    this.socket = socket;
    this.buffer = "";
    this.lines = [];
  }

  start() {
    this.socket.on("data", (chunk) => this.onData(chunk));
    this.socket.on("error", () => {});
    this.login();
  }

  onData(chunk) {
    const clean = stripTelnet(chunk.toString("binary"));
    for (const ch of clean) {
      if (ch === "\r" || ch === "\n") {
        const line = this.buffer;
        this.buffer = "";
        const resolve = this.pending;
        this.pending = null;
        if (resolve) resolve(line.trim());
        else this.lines.push(line.trim());
      } else if (ch === "\b" || ch.charCodeAt(0) === 127) {
        this.buffer = this.buffer.slice(0, -1);
      } else if (ch >= " ") {
        this.buffer += ch;
        this.write(ch);
      }
    }
  }

  prompt() {
    return new Promise((resolve) => {
      const next = this.lines.shift();
      if (next != null) {
        resolve(next);
        return;
      }
      this.pending = resolve;
    });
  }

  write(s) {
    this.socket.write(s, "binary");
  }

  clear(title) {
    this.write("\x1b[2J\x1b[H");
    this.write("\x1b[33;1m" + center(title, 80) + "\x1b[0m\r\n\r\n");
  }

  async login() {
    this.clear("NEWLAND EB VT DEMO");
    this.write("    User:     \x1b[7m                    \x1b[0m\r\n\r\n");
    this.write("    Password: \x1b[7m                    \x1b[0m\r\n\r\n");
    this.write("    Any non-empty user/password is accepted for demo.\r\n");
    this.write("\x1b[5;15H");
    const user = await this.prompt();
    this.write("\x1b[7;15H");
    await this.prompt();
    this.write(`\x1b[10;5H\x1b[32mWelcome ${user || "operator"}\x1b[0m`);
    setTimeout(() => this.menu(), 500);
  }

  async menu() {
    this.clear("NEWLAND EB TERMINAL TEST");
    this.write("    1. Outbound Picking\r\n");
    this.write("    2. Inbound Putaway\r\n");
    this.write("    3. Inventory Lookup\r\n");
    this.write("    4. Small Legacy Screen\r\n");
    this.write("    9. Logout\r\n\r\n");
    this.write("    Choice: ");
    const choice = await this.prompt();
    if (choice === "1") return this.outbound();
    if (choice === "2") return this.inbound();
    if (choice === "3") return this.inventory();
    if (choice === "4") return this.smallScreen();
    if (choice === "9") return this.login();
    this.write("\r\nInvalid choice.");
    setTimeout(() => this.menu(), 700);
  }

  async outbound() {
    this.clear("OUTBOUND PICKING");
    this.write("    Scan Task #: \x1b[7m                    \x1b[0m");
    this.write("\x1b[5;18H");
    const task = await this.prompt();
    this.clear(`PICK TASK ${task || "TASK-1001"}`);
    this.write("    Location: A-12-03-B\r\n");
    this.write("    Item:     WIDGET-001\r\n");
    this.write("    Required: 5\r\n\r\n");
    this.write("    Scan Location: \x1b[7m                    \x1b[0m");
    this.write("\x1b[8;20H");
    const loc = await this.prompt();
    if (loc && loc !== "A-12-03-B") {
      this.write(`\x1b[11;5H\x1b[31mWrong location: ${loc}. Expected A-12-03-B\x1b[0m`);
      setTimeout(() => this.outbound(), 1200);
      return;
    }
    this.write("\x1b[10;5HQty Picked: \x1b[7m    \x1b[0m\x1b[10;17H");
    await this.prompt();
    this.write("\x1b[13;5H\x1b[32mPick confirmed. Returning to menu...\x1b[0m");
    setTimeout(() => this.menu(), 900);
  }

  async inbound() {
    this.clear("INBOUND PUTAWAY");
    this.write("    Scan Pallet: \x1b[7m                    \x1b[0m\x1b[5;19H");
    const pallet = await this.prompt();
    this.clear(`PUTAWAY ${pallet || "PALLET-001"}`);
    this.write("    Suggested Location: C-08-02-A\r\n\r\n");
    this.write("    Scan Destination: \x1b[7m                    \x1b[0m\x1b[7;23H");
    await this.prompt();
    this.write("\x1b[10;5H\x1b[32mPutaway confirmed. Returning to menu...\x1b[0m");
    setTimeout(() => this.menu(), 900);
  }

  async inventory() {
    this.clear("INVENTORY LOOKUP");
    this.write("    Scan Item / SKU: \x1b[7m                    \x1b[0m\x1b[5;23H");
    const sku = await this.prompt();
    this.clear(`ITEM ${sku || "WIDGET-001"}`);
    this.write("    Description: Demo Widget\r\n");
    this.write("    On-Hand:     127\r\n");
    this.write("    Available:   115\r\n");
    this.write("    Locations:   A-12-03-B, A-15-07-C\r\n\r\n");
    this.write("    Press Enter to return to menu.");
    await this.prompt();
    this.menu();
  }

  async smallScreen() {
    this.clear("DENSE LEGACY SCREEN");
    for (let i = 0; i < 12; i++) {
      this.write(`PO45000988${i} SKU-WIDGET-${String(i).padStart(3, "0")} BIN A-${10 + i}-03-B QTY ${String(5 + i).padStart(4, "0")} STATUS READY\r\n`);
    }
    this.write("\r\n    Press Enter to return to menu.");
    await this.prompt();
    this.menu();
  }
}

class Tn5250DemoSession {
  constructor(socket) {
    this.socket = socket;
    this.step = 0;
    this.buffer = Buffer.alloc(0);
  }

  start() {
    this.socket.on("data", (chunk) => this.onData(chunk));
    this.socket.on("error", () => {});
    this.showLogin();
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
    if (this.buffer.length < 1) return;
    this.buffer = Buffer.alloc(0);
    this.step += 1;
    if (this.step === 1) return this.showMenu();
    if (this.step === 2) return this.showOutbound();
    if (this.step === 3) return this.showConfirm();
    this.showMenu();
  }

  send(record) {
    this.socket.write(record);
  }

  showLogin() {
    this.send(tn5250Screen([
      at5250(2, 23, "NEWLAND EB TN5250 DEMO"),
      at5250(5, 8, "USER:"),
      field5250(5, 16, 16),
      cursor5250(5, 16),
      at5250(7, 8, "PASSWORD:"),
      field5250(7, 16, 16),
      at5250(11, 8, "ANY INPUT + ENTER CONTINUES"),
    ]));
  }

  showMenu() {
    this.send(tn5250Screen([
      at5250(2, 24, "AS/400 STYLE MENU"),
      at5250(5, 8, "1. OUTBOUND PICKING"),
      at5250(6, 8, "2. INBOUND PUTAWAY"),
      at5250(7, 8, "3. INVENTORY LOOKUP"),
      at5250(10, 8, "CHOICE:"),
      field5250(10, 18, 2),
      cursor5250(10, 18),
    ]));
  }

  showOutbound() {
    this.send(tn5250Screen([
      at5250(2, 25, "OUTBOUND PICKING"),
      at5250(5, 8, "SCAN TASK:"),
      field5250(5, 21, 18),
      cursor5250(5, 21),
      at5250(7, 8, "SCAN LOCATION:"),
      field5250(7, 24, 18),
      at5250(9, 8, "CONFIRM QTY:"),
      field5250(9, 22, 5),
    ]));
  }

  showConfirm() {
    this.send(tn5250Screen([
      at5250(2, 25, "PICK CONFIRMED"),
      at5250(6, 8, "TRANSACTION ACCEPTED"),
      at5250(8, 8, "PRESS ENTER FOR NEXT MENU"),
      cursor5250(8, 34),
    ]));
  }
}

class Tn3270DemoSession {
  constructor(socket) {
    this.socket = socket;
    this.step = 0;
    this.buffer = Buffer.alloc(0);
  }

  start() {
    this.socket.on("data", (chunk) => this.onData(chunk));
    this.socket.on("error", () => {});
    this.showLogin();
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
    if (this.buffer.length < 1) return;
    this.buffer = Buffer.alloc(0);
    this.step += 1;
    if (this.step === 1) return this.showMenu();
    if (this.step === 2) return this.showLookup();
    if (this.step === 3) return this.showResult();
    this.showMenu();
  }

  send(record) {
    this.socket.write(record);
  }

  showLogin() {
    this.send(tn3270Screen([
      at3270(2, 23, "NEWLAND EB TN3270 DEMO"),
      at3270(5, 8, "USER:"),
      field3270(5, 16),
      cursor3270(5, 16),
      at3270(7, 8, "PASSWORD:"),
      field3270(7, 18),
      at3270(11, 8, "ANY INPUT + ENTER CONTINUES"),
    ]));
  }

  showMenu() {
    this.send(tn3270Screen([
      at3270(2, 24, "MAINFRAME STYLE MENU"),
      at3270(5, 8, "1. ORDER LOOKUP"),
      at3270(6, 8, "2. INVENTORY"),
      at3270(9, 8, "CHOICE:"),
      field3270(9, 18),
      cursor3270(9, 18),
    ]));
  }

  showLookup() {
    this.send(tn3270Screen([
      at3270(2, 27, "ORDER LOOKUP"),
      at3270(5, 8, "SCAN ORDER:"),
      field3270(5, 22),
      cursor3270(5, 22),
      at3270(7, 8, "SCAN ITEM:"),
      field3270(7, 21),
    ]));
  }

  showResult() {
    this.send(tn3270Screen([
      at3270(2, 27, "LOOKUP RESULT"),
      at3270(5, 8, "ORDER STATUS: READY"),
      at3270(7, 8, "NEXT ACTION: PICK AND CONFIRM"),
      at3270(10, 8, "PRESS ENTER FOR MENU"),
      cursor3270(10, 30),
    ]));
  }
}

function tn5250Screen(parts) {
  return Buffer.concat([
    Buffer.from([0x04, 0xF1, 0x00, 0x00]),
    ...parts,
  ]);
}

function at5250(row, col, text) {
  return Buffer.concat([
    Buffer.from([0x10, row, col]),
    ebcdic(text),
  ]);
}

function field5250(row, col, length) {
  return Buffer.concat([
    Buffer.from([0x10, row, col, 0x1D, 0x00, 0x00, 0x20]),
    ebcdic(" ".repeat(length)),
  ]);
}

function cursor5250(row, col) {
  return Buffer.from([0x11, row, col]);
}

function tn3270Screen(parts) {
  return Buffer.concat([
    Buffer.from([0xF5, 0x04]),
    ...parts,
  ]);
}

function at3270(row, col, text) {
  return Buffer.concat([
    Buffer.from([0x11, ...addr3270(row, col)]),
    ebcdic(text),
  ]);
}

function field3270(row, col) {
  return Buffer.concat([
    Buffer.from([0x11, ...addr3270(row, col), 0x1D, 0x40]),
  ]);
}

function cursor3270(row, col) {
  return Buffer.from([0x11, ...addr3270(row, col), 0x13]);
}

function addr3270(row, col) {
  const address = (row - 1) * 80 + (col - 1);
  const table = [
    0x40, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7,
    0xC8, 0xC9, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F,
    0x50, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7,
    0xD8, 0xD9, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F,
    0x60, 0x61, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
    0xE8, 0xE9, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
    0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7,
    0xF8, 0xF9, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,
  ];
  return [table[(address >> 6) & 0x3F], table[address & 0x3F]];
}

function ebcdic(text) {
  const bytes = [];
  for (const raw of text.toUpperCase()) {
    const code = raw.charCodeAt(0);
    if (raw >= "A" && raw <= "I") bytes.push(0xC1 + code - 65);
    else if (raw >= "J" && raw <= "R") bytes.push(0xD1 + code - 74);
    else if (raw >= "S" && raw <= "Z") bytes.push(0xE2 + code - 83);
    else if (raw >= "0" && raw <= "9") bytes.push(0xF0 + code - 48);
    else if (raw === " ") bytes.push(0x40);
    else if (raw === ".") bytes.push(0x4B);
    else if (raw === "<") bytes.push(0x4C);
    else if (raw === "(") bytes.push(0x4D);
    else if (raw === "+") bytes.push(0x4E);
    else if (raw === "|") bytes.push(0x4F);
    else if (raw === "&") bytes.push(0x50);
    else if (raw === "!") bytes.push(0x5A);
    else if (raw === "$") bytes.push(0x5B);
    else if (raw === "*") bytes.push(0x5C);
    else if (raw === ")") bytes.push(0x5D);
    else if (raw === ";") bytes.push(0x5E);
    else if (raw === "-") bytes.push(0x60);
    else if (raw === "/") bytes.push(0x61);
    else if (raw === ",") bytes.push(0x6B);
    else if (raw === "%") bytes.push(0x6C);
    else if (raw === "_") bytes.push(0x6D);
    else if (raw === ">") bytes.push(0x6E);
    else if (raw === "?") bytes.push(0x6F);
    else if (raw === ":") bytes.push(0x7A);
    else if (raw === "#") bytes.push(0x7B);
    else if (raw === "@") bytes.push(0x7C);
    else if (raw === "'") bytes.push(0x7D);
    else if (raw === "=") bytes.push(0x7E);
    else if (raw === "\"") bytes.push(0x7F);
    else bytes.push(0x40);
  }
  return Buffer.from(bytes);
}

function stripTelnet(input) {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code === 255) {
      i += 2;
      continue;
    }
    out += input[i];
  }
  return out;
}

function center(text, width) {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

function parseBool(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createHttpServer().listen(HTTP_PORT, HOST, () => {
    console.log(`HTTP demo listening on ${HOST}:${HTTP_PORT}`);
  });
  if (RAW_TCP_ENABLED) {
    createVtServer().listen(VT_PORT, HOST, () => {
      console.log(`VT demo listening on ${HOST}:${VT_PORT}`);
    });
    createTn5250Server().listen(TN5250_PORT, HOST, () => {
      console.log(`TN5250 demo listening on ${HOST}:${TN5250_PORT}`);
    });
    createTn3270Server().listen(TN3270_PORT, HOST, () => {
      console.log(`TN3270 demo listening on ${HOST}:${TN3270_PORT}`);
    });
  } else {
    console.log("Raw TCP terminal demos disabled for this deployment.");
  }
}
