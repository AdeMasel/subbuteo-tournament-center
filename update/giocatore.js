/* =========================================================
   SUBBUTEO TOURNAMENT CENTER — APP GIOCATORE
   ---------------------------------------------------------
   Il telefono del singolo giocatore: lo CHIAMA (suono, vibrazione,
   schermata a tutto campo) quando tocca a lui giocare o arbitrare,
   e tiene il suo DIARIO degli incontri, le CLASSIFICHE e il
   CALENDARIO dei prossimi impegni.

   Si apre da /giocatore (server 9.2.3 e successivi) oppure da
   /campo?app=giocatore: campo.html riconosce il parametro, si ferma e
   carica questo file. Così l'app arriva anche con il solo aggiornamento
   di contenuto, sui programmi installati prima che il server conoscesse
   /giocatore (quei server servono comunque tutti i file .js).

   Legge lo stato pubblicato dalla Regia (/api/state) con la «chiave
   giocatore», che il server accetta in sola lettura: l'unica cosa che
   l'app può mandare è «pvisto», la conferma di aver visto una chiamata.
   ========================================================= */
(function(){
'use strict';
if(window.__STC_GIOCATORE__)return;window.__STC_GIOCATORE__=true;

/* ---------------- lingua ---------------- */
const Q=new URLSearchParams(location.search);
const LS='giocatore_cfg';
let cfg={url:'',key:'',io:null,suoni:true,vibra:true,schermo:true,lang:''};
try{cfg=Object.assign(cfg,JSON.parse(localStorage.getItem(LS)||'{}'));}catch(e){}
const LANG=(Q.get('lang')||cfg.lang||((navigator.language||'it').toLowerCase().startsWith('it')?'it':'en'))==='en'?'en':'it';
cfg.lang=LANG;
const EN={
 'App Giocatore':'Player app','Chiamate, diario, classifiche e calendario':'Calls, diary, standings and schedule',
 'Indirizzo del server (dal QR della Regia)':'Server address (from the Control Desk QR)','Chiave':'Key',
 'Collegati':'Connect','Inquadra il QR «App Giocatore» mostrato dalla Regia: indirizzo e chiave si compilano da soli.':'Scan the “Player app” QR shown by the Control Desk: address and key fill in by themselves.',
 'Chi sei?':'Who are you?','Cerca il tuo nome':'Search your name','Scegli il tuo nome: il telefono ti chiamerà quando tocca a te giocare o arbitrare.':'Pick your name: the phone will call you when it is your turn to play or referee.',
 'Nessun nome trovato.':'No name found.','In attesa della Regia…':'Waiting for the Control Desk…','Il torneo non è ancora pubblicato: resta su questa pagina.':'The tournament is not published yet: stay on this page.',
 'Ora':'Now','Diario':'Diary','Classifica':'Standings','Calendario':'Schedule',
 'Collegato':'Connected','Non raggiungibile':'Unreachable',
 'TOCCA A TE!':'YOUR TURN!','ARBITRAGGIO':'REFEREE DUTY','Sei atteso al':'You are expected at','Arbitri al':'You referee at',
 'contro':'vs','Ho visto, arrivo':'Seen — on my way','Silenzia 1 minuto':'Mute for 1 minute',
 'Campo':'Field','Campi':'Fields','tavolo':'table','Tavolo':'Table',
 'IN CAMPO':'ON THE PITCH','Stai giocando al':'You are playing at','Stai arbitrando al':'You are refereeing at',
 'Prossima partita':'Next match','da programmare':'waiting for a field','Hai giocato tutte le partite in programma.':'You have played all your scheduled matches.',
 'Attendi: la Regia sta preparando i prossimi incontri.':'Please wait: the Control Desk is preparing the next matches.',
 'Tocca qui per attivare suoni e vibrazioni':'Tap here to switch on sounds and vibration',
 'Avvisi attivi':'Alerts on','Suoni':'Sounds','Vibrazione':'Vibration','Schermo sempre acceso':'Keep the screen on','Notifiche':'Notifications',
 'Prova l’avviso':'Test the alert','Cambia giocatore':'Change player','Esci':'Log out',
 'Tieni l’app aperta con lo schermo acceso: il browser non può suonare da una pagina chiusa.':'Keep the app open with the screen on: the browser cannot ring from a closed page.',
 'Su iPhone la vibrazione non è disponibile e il tasto silenzioso spegne i suoni.':'On iPhone vibration is not available and the silent switch mutes the sounds.',
 'Girone':'Group','Giornata':'Round','Amichevole':'Friendly','Fase finale':'Knockout stage',
 'Giocate':'Played','Vinte':'Won','Pari':'Drawn','Perse':'Lost','Gol fatti':'Goals for','Gol subiti':'Goals against',
 'Partite giocate':'Matches played','Nessuna partita giocata finora.':'No matches played so far.',
 'Arbitraggi':'Refereeing','Tornei precedenti':'Previous tournaments','I tuoi tavoli':'Your tables',
 'Pt':'Pts','G':'P','V':'W','N':'D','P':'L','GF':'GF','GS':'GA','DR':'GD',
 'Nessuna classifica disponibile.':'No standings available.','zona qualificazione':'qualifying zone',
 'Adesso':'Right now','Prossimi incontri':'Upcoming matches','Prossimi arbitraggi':'Upcoming refereeing',
 'Nessun impegno in programma.':'Nothing scheduled.','Gli accoppiamenti dei turni successivi si decidono man mano.':'Later pairings are decided round by round.',
 'in corso':'in progress','ti aspettano ora':'waiting for you now','visto':'seen',
 'Server non raggiungibile o chiave errata.':'Server unreachable or wrong key.','Chiave o indirizzo mancanti.':'Key or address missing.',
 'posto':'place','nel':'in','punti':'points','Sei':'You are',
 'Conferma inviata alla Regia':'Confirmation sent to the Control Desk','La Regia ti chiama di nuovo':'The Control Desk is calling you again',
 'squadra':'team','arbitro':'referee','Vittoria':'Win','Pareggio':'Draw','Sconfitta':'Loss','rigori':'penalties',
 'Suoni attivi':'Sounds on','Schermo acceso: disponibile solo con il collegamento https (da fuori casa).':'Screen-on is only available over https (remote link).',
 'Notifiche: disponibili solo con il collegamento https (da fuori casa).':'Notifications are only available over https (remote link).',
 'Mostra':'Show','partite':'matches','arbitraggi':'refereeing','Torneo':'Tournament','in attesa':'waiting',
 'La tua foto per la figurina':'Your photo for the sticker','Scatta un selfie o scegli una foto dalla galleria: arriva alla Regia, che ne fa la tua figurina.':'Take a selfie or pick a photo from your gallery: it goes to the Control Desk, which turns it into your sticker.',
 'Scatta':'Take photo','Galleria':'Gallery','Invio della foto…':'Sending the photo…','Foto inviata alla Regia':'Photo sent to the Control Desk',
 'Foto non inviata: riprova.':'Photo not sent: please try again.','Questa foto non si legge: provane un’altra.':'This photo cannot be read: try another one.',
 'Consiglio: viso ben illuminato, sfondo semplice, dal petto in su.':'Tip: well-lit face, plain background, chest up.','inviata alle':'sent at'
};
const T=s=>LANG==='en'&&EN[s]!=null?EN[s]:s;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------------- pagina ---------------- */
const CSS=`
:root{--bg:#060b1a;--bg2:#0b1430;--card:rgba(18,28,58,.78);--card2:rgba(27,40,80,.72);--line:rgba(255,255,255,.09);
  --text:#eef2ff;--muted:#8d98bd;--gold:#f5c542;--gold2:#ffe08a;--green:#3fe08f;--red:#ff5d73;--sky:#6fb6ff;--orange:#ff9f43;
  --r:18px;--nav:66px}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{min-height:100%;background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif}
body{background:radial-gradient(120% 60% at 50% -10%,#1b2d66 0%,rgba(6,11,26,0) 60%),radial-gradient(90% 50% at 100% 100%,rgba(63,224,143,.10),rgba(6,11,26,0) 60%),var(--bg);
  background-attachment:fixed;padding:calc(env(safe-area-inset-top) + 10px) 14px calc(var(--nav) + env(safe-area-inset-bottom) + 18px)}
button{font-family:inherit;touch-action:manipulation;cursor:pointer}
.hid{display:none!important}
.card{background:var(--card);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:var(--r);padding:16px;margin-bottom:12px;
  box-shadow:0 10px 30px rgba(0,0,0,.28)}
.sect{font-family:'Oswald',sans-serif;font-weight:600;font-size:.95rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;display:flex;align-items:center;gap:8px}
.sm{font-size:.8rem}.mu{color:var(--muted)}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:none;border-radius:14px;padding:14px 18px;font-size:1rem;font-weight:700;
  background:linear-gradient(135deg,var(--gold),var(--gold2));color:#241a02;box-shadow:0 8px 22px rgba(245,197,66,.25)}
.btn.sec{background:var(--card2);color:var(--text);border:1px solid var(--line);box-shadow:none}
.btn.mini{width:auto;padding:8px 13px;font-size:.82rem;border-radius:11px}
input{width:100%;background:rgba(5,10,26,.8);border:1px solid var(--line);border-radius:12px;color:var(--text);font-size:1rem;padding:12px 14px;font-family:inherit}
label.f{display:block;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:12px 0 5px}
/* intestazione */
#hd{display:flex;align-items:center;gap:11px;margin-bottom:12px}
#hd img{width:44px;height:44px;border-radius:11px;object-fit:contain;background:rgba(255,255,255,.06)}
#hd .tt{flex:1;min-width:0}
#hd .tn{font-family:'Oswald',sans-serif;font-size:1.12rem;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hd .me{display:flex;align-items:center;gap:7px;margin-top:2px;font-size:.8rem;color:var(--muted);min-width:0}
#hd .me b{color:var(--sky);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dot{width:9px;height:9px;border-radius:50%;background:var(--red);flex:0 0 auto;box-shadow:0 0 0 3px rgba(255,93,115,.15)}
.dot.on{background:var(--green);box-shadow:0 0 0 3px rgba(63,224,143,.18)}
/* barra in basso */
#nav{position:fixed;left:0;right:0;bottom:0;height:calc(var(--nav) + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);
  display:grid;grid-template-columns:repeat(4,1fr);background:rgba(8,14,34,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid var(--line);z-index:20}
#nav button{background:none;border:none;color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:.68rem;letter-spacing:.06em;position:relative}
#nav button i{font-style:normal;font-size:1.35rem;line-height:1;filter:grayscale(.6);opacity:.8;transition:transform .2s}
#nav button.on{color:var(--gold)}#nav button.on i{filter:none;opacity:1;transform:translateY(-2px) scale(1.08)}
#nav .bdg{position:absolute;top:8px;left:calc(50% + 8px);min-width:17px;height:17px;border-radius:9px;background:var(--red);color:#fff;font-size:.66rem;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;animation:pulsa 1s infinite}
/* sblocco audio */
.sblocca{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(255,159,67,.2),rgba(245,197,66,.12));border:1px solid rgba(255,159,67,.5);
  border-radius:14px;padding:12px 14px;margin-bottom:12px;font-weight:700;font-size:.92rem}
.sblocca i{font-style:normal;font-size:1.5rem;animation:dondola 1.4s ease-in-out infinite}
/* eroe della scheda Ora */
.eroe{position:relative;overflow:hidden;border-radius:22px;padding:20px 18px;margin-bottom:12px;border:1px solid var(--line);
  background:linear-gradient(150deg,rgba(38,58,122,.9),rgba(14,22,50,.95))}
.eroe:before{content:'';position:absolute;inset:-40% -20% auto auto;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(111,182,255,.28),transparent 70%)}
.eroe.live{background:linear-gradient(150deg,rgba(30,110,74,.92),rgba(10,32,28,.95))}
.eroe.chiama{background:linear-gradient(150deg,rgba(160,96,10,.95),rgba(60,26,6,.95))}
.eroe.arb{background:linear-gradient(150deg,rgba(40,70,170,.95),rgba(14,20,60,.95))}
.eroe .k{font-family:'Oswald',sans-serif;letter-spacing:.2em;font-size:.8rem;text-transform:uppercase;opacity:.85}
.eroe .big{font-family:'Oswald',sans-serif;font-size:2rem;line-height:1.1;margin:6px 0 4px;letter-spacing:.02em}
.eroe .vs{font-size:1.02rem;font-weight:600}
.eroe .ctx{font-size:.8rem;opacity:.75;margin-top:4px}
.eroe .score{display:flex;align-items:center;justify-content:center;gap:14px;margin:12px 0 6px;font-family:'Chakra Petch',monospace;font-weight:700;font-size:2.6rem}
.eroe .score span{min-width:52px;text-align:center}
.eroe .min{text-align:center;font-family:'Chakra Petch',monospace;font-size:.9rem;opacity:.85}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 11px;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.pill.live{background:var(--red);color:#fff;animation:pulsa 1.2s infinite}
.pill.ok{background:rgba(63,224,143,.18);color:var(--green);border:1px solid rgba(63,224,143,.4)}
.pos{display:flex;align-items:center;gap:12px}
.pos .n{font-family:'Oswald',sans-serif;font-size:2.4rem;color:var(--gold);line-height:1}
/* impostazioni */
.set{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--line);font-size:.94rem}
.set:last-of-type{border-bottom:none}
.sw{position:relative;width:48px;height:28px;border-radius:14px;background:#2a355d;border:none;flex:0 0 auto;transition:background .2s}
.sw:after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .2s}
.sw.on{background:var(--green)}.sw.on:after{transform:translateX(20px)}
.sw:disabled{opacity:.35}
/* liste */
.riga{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:14px;background:var(--card2);border:1px solid var(--line);margin-bottom:8px}
.riga .es{flex:0 0 auto;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem}
.es.V{background:rgba(63,224,143,.2);color:var(--green)}.es.N{background:rgba(245,197,66,.18);color:var(--gold)}.es.P{background:rgba(255,93,115,.18);color:var(--red)}.es.A{background:rgba(111,182,255,.18);color:var(--sky)}.es.X{background:rgba(255,255,255,.08);color:var(--muted)}
.riga .tx{flex:1;min-width:0}
.riga .tx b{display:block;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.riga .tx small{display:block;color:var(--muted);font-size:.74rem;margin-top:2px}
.riga .sc{font-family:'Chakra Petch',monospace;font-weight:700;font-size:1.1rem;white-space:nowrap}
.riga.ora{border-color:rgba(255,159,67,.6);box-shadow:0 0 0 1px rgba(255,159,67,.25) inset}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tile{background:var(--card2);border:1px solid var(--line);border-radius:14px;padding:10px 8px;text-align:center}
.tile b{display:block;font-family:'Oswald',sans-serif;font-size:1.6rem;line-height:1.1}
.tile span{font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.tile.V b{color:var(--green)}.tile.N b{color:var(--gold)}.tile.P b{color:var(--red)}
/* classifica */
table.cl{width:100%;border-collapse:collapse;font-size:.86rem}
table.cl th{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:4px 3px;text-align:center}
table.cl td{padding:8px 3px;text-align:center;border-top:1px solid var(--line);font-family:'Chakra Petch',monospace}
table.cl td.nm{text-align:left;font-family:'Inter',sans-serif;max-width:40vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
table.cl td.pt{font-weight:700;color:var(--gold)}
table.cl tr.me td{background:rgba(111,182,255,.14)}table.cl tr.me td.nm{color:var(--sky);font-weight:700}
table.cl tr.q td:first-child{box-shadow:inset 3px 0 0 var(--green)}
details{margin-top:8px}summary{cursor:pointer;color:var(--muted);font-size:.86rem;padding:6px 0;list-style:none}
summary::-webkit-details-marker{display:none}summary:before{content:'▸ ';}details[open] summary:before{content:'▾ ';}
/* scelta del nome */
.nomi{display:flex;flex-direction:column;gap:7px;margin-top:12px;max-height:58vh;overflow:auto}
.nomi button{display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;background:var(--card2);border:1px solid var(--line);color:var(--text);
  border-radius:13px;padding:13px 14px;font-size:1rem}
.nomi button small{color:var(--muted);font-size:.76rem}
/* LA CHIAMATA */
#chiama{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px 22px calc(30px + env(safe-area-inset-bottom));
  background:radial-gradient(circle at 50% 35%,#c9790f 0%,#5a2a06 55%,#1a0b02 100%)}
#chiama.arb{background:radial-gradient(circle at 50% 35%,#2f64e0 0%,#142a6e 55%,#060b1f 100%)}
#chiama .anelli{position:relative;width:170px;height:170px;margin-bottom:22px}
#chiama .anelli i{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,255,255,.55);animation:onda 2s ease-out infinite}
#chiama .anelli i:nth-child(2){animation-delay:.66s}#chiama .anelli i:nth-child(3){animation-delay:1.33s}
#chiama .anelli b{position:absolute;inset:26px;border-radius:50%;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:4.2rem;animation:dondola 1s ease-in-out infinite}
#chiama .k{font-family:'Oswald',sans-serif;font-size:2.3rem;letter-spacing:.08em;text-shadow:0 4px 24px rgba(0,0,0,.4)}
#chiama .dove{font-family:'Oswald',sans-serif;font-size:3.4rem;line-height:1;margin:12px 0 6px;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.45)}
#chiama .chi{font-size:1.15rem;font-weight:700;margin-top:4px}
#chiama .ctx{font-size:.86rem;opacity:.8;margin-top:6px}
#chiama .az{width:100%;max-width:420px;margin-top:30px;display:flex;flex-direction:column;gap:10px}
#chiama .btn{padding:18px;font-size:1.15rem;background:#fff;color:#1a1204;box-shadow:0 12px 34px rgba(0,0,0,.35)}
#chiama .btn.sec{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.3);padding:12px;font-size:.95rem}
.toast{position:fixed;left:50%;bottom:calc(var(--nav) + 22px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#16224a;border:1px solid var(--line);color:var(--text);
  padding:11px 18px;border-radius:13px;font-size:.9rem;z-index:120;box-shadow:0 12px 30px rgba(0,0,0,.5);max-width:92vw;animation:su .25s ease-out}
@keyframes pulsa{50%{opacity:.45}}
@keyframes onda{0%{transform:scale(.55);opacity:1}100%{transform:scale(1.35);opacity:0}}
@keyframes dondola{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg)}}
@keyframes su{from{transform:translate(-50%,14px);opacity:0}}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
`;
function monta(){
  document.documentElement.lang=LANG;
  const h=document.head;
  const meta=(n,c)=>{if(document.querySelector(`meta[name="${n}"]`))return;const m=document.createElement('meta');m.name=n;m.content=c;h.appendChild(m);};
  meta('viewport','width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
  meta('theme-color','#060b1a');meta('apple-mobile-web-app-capable','yes');meta('mobile-web-app-capable','yes');
  document.title=T('App Giocatore')+' — Subbuteo';
  const f=document.createElement('link');f.rel='stylesheet';
  f.href='https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;600;700;800&family=Chakra+Petch:wght@600;700&display=swap';h.appendChild(f);
  const st=document.createElement('style');st.textContent=CSS;h.appendChild(st);
  document.body.innerHTML=`
  <section id="s-conn" class="hid"><div class="card">
    <div class="sect">📣 ${T('App Giocatore')}</div>
    <p class="sm mu">${T('Chiamate, diario, classifiche e calendario')}</p>
    <label class="f">${T('Indirizzo del server (dal QR della Regia)')}</label><input id="c-url" type="url" placeholder="http://192.168.1.10:8765">
    <label class="f">${T('Chiave')}</label><input id="c-key" type="text" autocapitalize="characters" placeholder="XXXX">
    <div style="margin-top:16px"><button class="btn" id="c-go">🔗 ${T('Collegati')}</button></div>
    <p class="sm mu" style="margin-top:12px">${T('Inquadra il QR «App Giocatore» mostrato dalla Regia: indirizzo e chiave si compilano da soli.')}</p>
  </div></section>
  <section id="s-chi" class="hid"><div class="card">
    <div class="sect">👤 ${T('Chi sei?')}</div>
    <p class="sm mu">${T('Scegli il tuo nome: il telefono ti chiamerà quando tocca a te giocare o arbitrare.')}</p>
    <div style="margin-top:12px"><input id="chi-q" type="search" placeholder="🔎 ${T('Cerca il tuo nome')}"></div>
    <div class="nomi" id="chi-l"></div>
  </div></section>
  <section id="s-att" class="hid"><div class="card" style="text-align:center;padding:30px 18px">
    <div style="font-size:2.6rem;margin-bottom:10px">⏳</div><b>${T('In attesa della Regia…')}</b>
    <p class="sm mu" style="margin-top:6px">${T('Il torneo non è ancora pubblicato: resta su questa pagina.')}</p>
  </div></section>
  <section id="s-app" class="hid">
    <header id="hd"><img id="hd-logo" alt="" class="hid"><div class="tt"><div class="tn" id="hd-t">—</div><div class="me"><span class="dot" id="hd-dot"></span><b id="hd-me"></b><span id="hd-sub"></span></div></div></header>
    <div id="v-ora"></div><div id="v-diario" class="hid"></div><div id="v-classifica" class="hid"></div><div id="v-calendario" class="hid"></div>
    <nav id="nav">
      <button data-v="ora" class="on"><i>📣</i>${T('Ora')}</button>
      <button data-v="diario"><i>📖</i>${T('Diario')}</button>
      <button data-v="classifica"><i>🏆</i>${T('Classifica')}</button>
      <button data-v="calendario"><i>📅</i>${T('Calendario')}</button>
    </nav>
  </section>
  <div id="chiama" class="hid"></div>`;
  $('#c-go').onclick=collegaDaForm;
  $('#chi-q').oninput=renderChi;
  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>vista(b.dataset.v));
  document.addEventListener('pointerdown',sbloccaAudio,{passive:true});
}
const $=s=>document.querySelector(s);
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),3200);}
function salva(){try{localStorage.setItem(LS,JSON.stringify(cfg));}catch(e){}}
function mostra(id){['#s-conn','#s-chi','#s-att','#s-app'].forEach(s=>$(s).classList.toggle('hid',s!==id));}

/* ---------------- collegamento ---------------- */
const DEV=(()=>{let d=null;try{d=localStorage.getItem('giocatore_dev');}catch(e){}if(!d){d='gio'+Math.random().toString(36).slice(2,10);try{localStorage.setItem('giocatore_dev',d);}catch(e){}}return d;})();
let snap=null,seq=0,connesso=false,pollT=null,errori=0;
function api(p){return cfg.url.replace(/\/+$/,'')+p;}
(function daQR(){
  const u=Q.get('u')||((/^https?:$/.test(location.protocol)&&!/github\.io$/.test(location.hostname))?location.origin:null);
  if(u)cfg.url=u;
  const k=Q.get('k');
  if(k&&k.toUpperCase()!==cfg.key){cfg.key=k.toUpperCase();seq=0;}
  salva();
})();
function collegaDaForm(){
  sbloccaAudio();
  const u=$('#c-url').value.trim(),k=$('#c-key').value.trim().toUpperCase();
  if(!u||!k){toast(T('Chiave o indirizzo mancanti.'));return;}
  cfg.url=u;cfg.key=k;salva();avvia();
}
function avvia(){
  if(!cfg.url||!cfg.key){$('#c-url').value=cfg.url||'';$('#c-key').value=cfg.key||'';mostra('#s-conn');return;}
  seq=0;leggi(true);
}
function pianifica(ms){clearTimeout(pollT);pollT=setTimeout(()=>leggi(false),ms);}
function leggi(primo){
  fetch(api('/api/state?key='+encodeURIComponent(cfg.key)+'&seq='+seq),{cache:'no-store'})
    .then(r=>{if(r.status===403){const e=new Error('chiave');e.chiave=true;throw e;}return r.json();})
    .then(d=>{
      connesso=true;errori=0;
      if(d.snap!==undefined){snap=d.snap;seq=d.seq;dopoStato();}
      else if(d.err&&!snap){mostra('#s-att');}
      else aggiornaPunto();
      pianifica(document.hidden?6000:2500);
    })
    .catch(e=>{
      connesso=false;errori++;aggiornaPunto();
      if(primo&&!snap){if(e&&e.chiave){toast(T('Server non raggiungibile o chiave errata.'));$('#c-url').value=cfg.url;$('#c-key').value=cfg.key;mostra('#s-conn');return;}mostra('#s-att');}
      pianifica(Math.min(15000,2500*Math.pow(1.5,Math.min(errori,5))));
    });
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&cfg.key){pianifica(50);schermoAcceso();}});

/* ---------------- dati del torneo ---------------- */
function partite(){
  if(!snap)return[];
  const out=[];
  (snap.groups||[]).forEach(g=>(g.matches||[]).forEach(m=>out.push(Object.assign({},m,{kind:'group',g:g.name,ord:m.r||1,ctx:`${T('Girone')} ${g.name} · ${T('Giornata')} ${m.r||1}`}))));
  (snap.kos||[]).forEach(ko=>(ko.rounds||[]).forEach((rd,ri)=>(rd.matches||[]).forEach(m=>{if(m.h&&m.a)out.push(Object.assign({},m,{kind:'ko',ord:1000+ri,ctx:`${ko.t||T('Fase finale')} · ${rd.name}`}));})));
  (snap.free||[]).forEach(m=>out.push(Object.assign({},m,{kind:'free',ord:5000,ctx:T('Amichevole')})));
  return out;
}
function trova(id){return partite().find(m=>m.id===id);}
function iscritti(){
  const s=new Set();
  (snap.std||[]).forEach(g=>g.rows.forEach(r=>s.add(r[0])));
  partite().forEach(m=>{if(m.kind!=='free'){s.add(m.h);s.add(m.a);}});
  s.delete(undefined);s.delete(null);s.delete('');
  return[...s];
}
/* chi può essere chiamato: i giocatori (o gli iscritti) e gli arbitri */
function nomi(){
  if(!snap)return[];
  const out=[],visti=new Set();
  const add=(n,x)=>{n=String(n||'').trim();if(!n)return;const k=n.toLowerCase();if(visti.has(k))return;visti.add(k);out.push(Object.assign({nome:n},x));};
  if(snap.sq)Object.keys(snap.rosters||{}).forEach(t=>(snap.rosters[t]||[]).forEach(p=>add(p,{team:t})));
  else iscritti().forEach(e=>{const ps=(snap.pl&&snap.pl[e])||[];if(ps.length)ps.forEach(p=>add(p,{ent:e}));else add(e,{ent:e});});
  partite().forEach(m=>{if(m.ref)add(m.ref,{arb:true});(m.refs||[]).forEach(r=>add(r,{arb:true}));});
  return out.sort((a,b)=>a.nome.localeCompare(b.nome,LANG));
}
const io=()=>cfg.io;
function mia(m){const x=io();if(!x)return false;return snap.sq?!!x.team&&(m.h===x.team||m.a===x.team):!!x.ent&&(m.h===x.ent||m.a===x.ent);}
function lato(m){const x=io();return (snap.sq?m.h===x.team:m.h===x.ent)?1:2;}
function arbIdx(m){const x=io();if(!x)return -1;if(Array.isArray(m.refs)){const k=m.refs.indexOf(x.nome);if(k>=0)return k;}return m.ref===x.nome?0:-1;}
function mioTavolo(m){if(!snap.sq||!Array.isArray(m.sub))return -1;const s=lato(m);return m.sub.findIndex(g=>(s===1?g.ph:g.pa)===io().nome);}
function tabellone(mid){return (snap.boards||[]).find(b=>b.mid===mid)||null;}
function dove(b,k,tipo){
  if(!b)return '';
  if(snap.sq){if(k>=0)return `${T('Campo')} ${b.f+k}`;return `${T('Campi')} ${b.f}–${b.f+3}`;}
  return `${T('Campo')} ${b.f}`;
}
function avversario(m){return lato(m)===1?m.a:m.h;}
function gol(m){const s=lato(m);return s===1?[m.hs,m.as]:[m.as,m.hs];}
function esito(m){
  if(!m.done)return null;
  const [a,b]=gol(m);if(a==null||b==null)return null;
  if(a>b)return 'V';if(a<b)return 'P';
  if(m.kind==='ko'&&m.p1!=null&&m.p2!=null&&m.p1!==m.p2){const s=lato(m);const mp=s===1?m.p1:m.p2,op=s===1?m.p2:m.p1;return mp>op?'V':'P';}
  return 'N';
}
function punteggio(m){const [a,b]=gol(m);if(a==null&&b==null)return '';let t=`${a??0}–${b??0}`;if(m.kind==='ko'&&m.p1!=null&&m.p2!=null&&(m.p1||m.p2)){const s=lato(m);t+=` (${s===1?m.p1:m.p2}–${s===1?m.p2:m.p1} ${T('rigori')})`;}return t;}

/* ---------------- chiamate ---------------- */
let visti={};try{visti=JSON.parse(localStorage.getItem('giocatore_visti')||'{}');}catch(e){}
function salvaVisti(){try{localStorage.setItem('giocatore_visti',JSON.stringify(visti));}catch(e){}}
function doveri(){
  if(!snap||!io())return[];
  const out=[];
  (snap.boards||[]).forEach(b=>{
    if(!b.mid)return;const m=trova(b.mid);if(!m||m.done)return;
    if(mia(m))out.push({id:'g:'+cfg.key+':'+m.id,tipo:'gioca',m,b,k:mioTavolo(m)});
    const a=arbIdx(m);if(a>=0)out.push({id:'a:'+cfg.key+':'+m.id,tipo:'arbitra',m,b,k:Array.isArray(m.refs)&&m.refs.length>1?a:-1});
  });
  return out;
}
function daChiamare(){
  return doveri().filter(d=>{
    const v=visti[d.id],cl=d.b.cl||0;
    if(!v)return !(d.tipo==='gioca'&&d.b.run&&!cl);   // già in campo: non serve chiamare
    return cl>(v.cl||0);
  });
}
let inChiamata=null,squilloT=null,mutoFino=0,titoloT=null;
function controllaChiamate(){
  const lista=daChiamare();
  const bd=document.querySelector('#nav button[data-v="ora"]');
  if(bd){let x=bd.querySelector('.bdg');if(lista.length){if(!x){x=document.createElement('span');x.className='bdg';bd.appendChild(x);}x.textContent=lista.length;}else if(x)x.remove();}
  if(!lista.length){chiudiChiamata();return;}
  const d=lista[0];
  const nuova=!inChiamata||inChiamata.id!==d.id||inChiamata.cl!==(d.b.cl||0);
  inChiamata={id:d.id,cl:d.b.cl||0,d};
  disegnaChiamata(d);
  if(nuova){
    if(visti[d.id]&&d.b.cl)toast('📣 '+T('La Regia ti chiama di nuovo'));
    squilla(d);notifica(d);
    clearInterval(squilloT);squilloT=setInterval(()=>{if(inChiamata)squilla(inChiamata.d);},12000);
    lampeggiaTitolo(d);
  }
}
function disegnaChiamata(d){
  const el=$('#chiama');const arb=d.tipo==='arbitra';
  el.className=arb?'arb':'';
  const m=d.m;
  el.innerHTML=`<div class="anelli"><i></i><i></i><i></i><b>${arb?'🧑‍⚖️':'📣'}</b></div>
    <div class="k">${arb?T('ARBITRAGGIO'):T('TOCCA A TE!')}</div>
    <div class="dove">${esc(dove(d.b,d.k,d.tipo))}</div>
    <div class="chi">${arb?`${esc(m.h)} – ${esc(m.a)}`:`${T('contro')} ${esc(avversario(m))}`}</div>
    <div class="ctx">${esc(m.ctx)}</div>
    <div class="az"><button class="btn" id="ch-ok">✓ ${T('Ho visto, arrivo')}</button>
      <button class="btn sec" id="ch-muto">🔕 ${T('Silenzia 1 minuto')}</button></div>`;
  $('#ch-ok').onclick=()=>conferma(d);
  $('#ch-muto').onclick=()=>{mutoFino=Date.now()+60000;fermaSuono();};
}
function chiudiChiamata(){
  // si zittisce solo una chiamata vera: un «Prova l'avviso» in corso non va troncato
  const eraAttiva=!!inChiamata||!!squilloT;
  inChiamata=null;clearInterval(squilloT);squilloT=null;if(eraAttiva)fermaSuono();
  $('#chiama').classList.add('hid');$('#chiama').innerHTML='';
  clearInterval(titoloT);titoloT=null;document.title=T('App Giocatore')+' — Subbuteo';
}
function lampeggiaTitolo(d){
  clearInterval(titoloT);let on=false;
  titoloT=setInterval(()=>{on=!on;document.title=on?(d.tipo==='arbitra'?'🧑‍⚖️ '+T('ARBITRAGGIO'):'📣 '+T('TOCCA A TE!')):dove(d.b,d.k)+' — '+T('App Giocatore');},1000);
}
function conferma(d){
  sbloccaAudio();
  visti[d.id]={ts:Date.now(),cl:d.b.cl||0};salvaVisti();
  invia({type:'pvisto',mid:d.m.id,ruolo:d.tipo});
  suona('ok');if(cfg.vibra&&navigator.vibrate)try{navigator.vibrate(40);}catch(e){}
  toast('✓ '+T('Conferma inviata alla Regia'));
  inChiamata=null;controllaChiamate();render();
}
/* la coda delle conferme: poche, ma non devono perdersi se la rete salta */
let coda=[];try{coda=JSON.parse(localStorage.getItem('giocatore_coda')||'[]');}catch(e){}
let invioT=null,inviando=false;
function invia(ev){ev.by=io()?io().nome:undefined;ev.dev=DEV;ev.ts=Date.now();coda.push(ev);if(coda.length>30)coda.shift();salvaCoda();manda();}
function salvaCoda(){try{localStorage.setItem('giocatore_coda',JSON.stringify(coda));}catch(e){}}
function manda(){
  if(inviando||!coda.length)return;inviando=true;
  fetch(api('/api/event'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:cfg.key,ev:coda[0]})})
    .then(r=>{inviando=false;if(r.ok||(r.status>=400&&r.status<500&&r.status!==408&&r.status!==429)){coda.shift();salvaCoda();if(coda.length)manda();}else throw 0;})
    .catch(()=>{inviando=false;clearTimeout(invioT);invioT=setTimeout(manda,5000);});
}

/* ---------------- suoni, vibrazione, schermo, notifiche ---------------- */
let AC=null,audioOk=false,nodi=[];
function sbloccaAudio(){
  try{
    if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(C)AC=new C();}
    if(AC&&AC.state==='suspended')AC.resume();
    if(AC&&!audioOk){const b=AC.createBuffer(1,1,22050),s=AC.createBufferSource();s.buffer=b;s.connect(AC.destination);s.start(0);}
    audioOk=!!AC;
  }catch(e){}
  schermoAcceso();
  const x=$('#sblocca');if(x&&audioOk)x.remove();
}
function fermaSuono(){nodi.forEach(n=>{try{n.stop();}catch(e){}});nodi=[];if(navigator.vibrate)try{navigator.vibrate(0);}catch(e){}}
/* campanella: tre note limpide con un armonico da campana, due volte */
function campana(t,f,dur,vol){
  [[1,1],[2.76,.28],[5.4,.1]].forEach(([k,a])=>{
    const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f*k;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol*a,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(AC.destination);o.start(t);o.stop(t+dur+.05);nodi.push(o);
  });
}
/* fischietto dell'arbitro: tono alto con il trillo della pallina */
function fischio(t,dur,vol){
  const o=AC.createOscillator(),lfo=AC.createOscillator(),lg=AC.createGain(),g=AC.createGain();
  o.type='triangle';o.frequency.value=2750;lfo.frequency.value=34;lg.gain.value=180;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.setValueAtTime(vol,t+dur-.04);g.gain.linearRampToValueAtTime(0,t+dur);
  o.connect(g).connect(AC.destination);o.start(t);lfo.start(t);o.stop(t+dur+.02);lfo.stop(t+dur+.02);nodi.push(o,lfo);
}
function suona(tipo){
  if(!cfg.suoni||!AC||Date.now()<mutoFino)return;
  try{
    if(AC.state==='suspended')AC.resume();
    const t=AC.currentTime+.05;
    if(tipo==='gioca'){[0,1].forEach(r=>{const b=t+r*1.25;campana(b,784,1.1,.34);campana(b+.18,988,1.1,.30);campana(b+.36,1175,1.4,.30);campana(b+.54,1568,1.8,.26);});}
    else if(tipo==='arbitra'){fischio(t,.28,.22);fischio(t+.42,.28,.22);fischio(t+.9,1.0,.24);}
    else if(tipo==='ok'){campana(t,1319,.5,.18);campana(t+.1,1760,.7,.16);}
  }catch(e){}
}
function squilla(d){
  if(Date.now()<mutoFino)return;
  suona(d.tipo);
  if(cfg.vibra&&navigator.vibrate){try{navigator.vibrate(d.tipo==='arbitra'?[220,110,220,110,220,300,800]:[600,200,600,200,1000]);}catch(e){}}
}
function notifica(d){
  if(!document.hidden||!('Notification' in window)||Notification.permission!=='granted')return;
  const titolo=(d.tipo==='arbitra'?'🧑‍⚖️ '+T('ARBITRAGGIO'):'📣 '+T('TOCCA A TE!'))+' — '+dove(d.b,d.k);
  const corpo=d.tipo==='arbitra'?`${d.m.h} – ${d.m.a}`:`${T('contro')} ${avversario(d.m)}`;
  try{
    if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration)
      navigator.serviceWorker.getRegistration().then(r=>{if(r)r.showNotification(titolo,{body:corpo,tag:d.id,renotify:true,requireInteraction:true,vibrate:[600,200,600]});else new Notification(titolo,{body:corpo,tag:d.id});}).catch(()=>{});
    else new Notification(titolo,{body:corpo,tag:d.id});
  }catch(e){}
}
let wake=null;
async function schermoAcceso(){
  if(!cfg.schermo||!('wakeLock' in navigator)||document.hidden)return;
  try{if(!wake||wake.released){wake=await navigator.wakeLock.request('screen');}}catch(e){}
}
function interruttore(chiave){
  if(chiave==='notifiche'){
    if(!('Notification' in window)||!window.isSecureContext){toast(T('Notifiche: disponibili solo con il collegamento https (da fuori casa).'));return;}
    Notification.requestPermission().then(()=>render());return;
  }
  cfg[chiave]=!cfg[chiave];salva();
  if(chiave==='schermo'){if(!cfg.schermo&&wake){try{wake.release();}catch(e){}wake=null;}else if(!('wakeLock' in navigator))toast(T('Schermo acceso: disponibile solo con il collegamento https (da fuori casa).'));else schermoAcceso();}
  if(chiave==='suoni'&&cfg.suoni){sbloccaAudio();suona('ok');}
  if(chiave==='vibra'&&cfg.vibra&&navigator.vibrate)try{navigator.vibrate(120);}catch(e){}
  render();
}

/* ---------------- diario conservato sul telefono ---------------- */
function idTorneo(){return [snap.n||'',snap.date||'',snap.loc||''].join('|');}
let archivio={};try{archivio=JSON.parse(localStorage.getItem('giocatore_diario')||'{}');}catch(e){}
function aggiornaArchivio(){
  if(!snap||!io())return;
  const tid=idTorneo(),prima=archivio[tid]||{};
  const quando=Object.assign({},prima.quando||{});
  const mie=partite().filter(m=>mia(m)&&m.done);
  const arb=partite().filter(m=>m.done&&arbIdx(m)>=0);
  mie.concat(arb).forEach(m=>{if(!quando[m.id])quando[m.id]=Date.now();});
  archivio[tid]={n:snap.n||T('Torneo'),date:snap.date||'',loc:snap.loc||'',nome:io().nome,sq:!!snap.sq,chi:io().team||io().ent||'',agg:Date.now(),quando,
    partite:mie.map(m=>({id:m.id,ctx:m.ctx,avv:avversario(m),sc:punteggio(m),es:esito(m)})),
    arbitraggi:arb.map(m=>({id:m.id,ctx:m.ctx,h:m.h,a:m.a,sc:`${m.hs??0}–${m.as??0}`}))};
  const chiavi=Object.keys(archivio).sort((a,b)=>archivio[b].agg-archivio[a].agg);
  chiavi.slice(30).forEach(k=>delete archivio[k]);
  try{localStorage.setItem('giocatore_diario',JSON.stringify(archivio));}catch(e){}
}

/* ---------------- disegno ---------------- */
let vistaCorr='ora';const aperti=new Set();
function vista(v){
  vistaCorr=v;
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  ['ora','diario','classifica','calendario'].forEach(x=>$('#v-'+x).classList.toggle('hid',x!==v));
  render();window.scrollTo({top:0});
}
function dopoStato(){
  if(!snap){mostra('#s-att');return;}
  const x=io();
  if(Q.get('p')&&!(x&&x.nome===Q.get('p'))){const n=nomi().find(y=>y.nome===Q.get('p'));if(n){cfg.io=n;salva();}}
  if(!io()||!nomi().some(y=>y.nome===io().nome)){mostra('#s-chi');if(Q.get('p')&&!$('#chi-q').value)$('#chi-q').value=Q.get('p');renderChi();return;}
  mostra('#s-app');aggiornaArchivio();render();controllaChiamate();
}
function renderChi(){
  const q=($('#chi-q').value||'').trim().toLowerCase();
  const l=nomi().filter(x=>!q||x.nome.toLowerCase().includes(q)||String(x.team||x.ent||'').toLowerCase().includes(q));
  $('#chi-l').innerHTML=l.length?l.map((x,i)=>`<button data-i="${i}"><span>${esc(x.nome)}</span><small>${esc(x.team||(x.ent&&x.ent!==x.nome?x.ent:'')||(x.arb?T('arbitro'):''))}</small></button>`).join('')
    :`<p class="sm mu">${T('Nessun nome trovato.')}</p>`;
  $('#chi-l').querySelectorAll('button').forEach(b=>b.onclick=()=>{sbloccaAudio();cfg.io=l[+b.dataset.i];salva();visti={};salvaVisti();dopoStato();});
}
function aggiornaPunto(){const d=$('#hd-dot');if(d){d.classList.toggle('on',connesso);d.title=connesso?T('Collegato'):T('Non raggiungibile');}}
function render(){
  if(!snap||!io())return;
  const lg=$('#hd-logo');if(snap.logo){lg.src=snap.logo;lg.classList.remove('hid');}else lg.classList.add('hid');
  $('#hd-t').textContent=snap.n||T('Torneo');
  $('#hd-me').textContent=io().nome;
  $('#hd-sub').textContent=(io().team||(io().ent!==io().nome?io().ent:''))||'';
  aggiornaPunto();
  const v=vistaCorr;
  if(v==='ora')$('#v-ora').innerHTML=htmlOra();
  if(v==='diario')$('#v-diario').innerHTML=htmlDiario();
  if(v==='classifica')$('#v-classifica').innerHTML=htmlClassifica();
  if(v==='calendario')$('#v-calendario').innerHTML=htmlCalendario();
  const box=$('#v-'+v);
  box.querySelectorAll('details[data-k]').forEach(d=>d.ontoggle=()=>{if(d.open)aperti.add(d.dataset.k);else aperti.delete(d.dataset.k);});
  box.querySelectorAll('[data-az]').forEach(b=>b.onclick=()=>azione(b.dataset.az));
}
function azione(a){
  if(a==='sblocca'){sbloccaAudio();suona('ok');render();return;}
  if(a==='prova'){sbloccaAudio();const d={tipo:'gioca'};squilla(d);return;}
  if(a==='prova-arb'){sbloccaAudio();squilla({tipo:'arbitra'});return;}
  if(a==='foto-scatta'||a==='foto-galleria'){scegliFoto(a==='foto-scatta');return;}
  if(a==='cambia'){cfg.io=null;salva();chiudiChiamata();$('#chi-q').value='';mostra('#s-chi');renderChi();return;}
  if(a==='esci'){cfg.io=null;cfg.key='';salva();chiudiChiamata();clearTimeout(pollT);snap=null;avvia();return;}
  interruttore(a);
}
function mieProssime(){return partite().filter(m=>mia(m)&&!m.done).sort((a,b)=>a.ord-b.ord);}
function miaClassifica(){
  const chi=snap.sq?io().team:io().ent;if(!chi)return null;
  for(const g of classifiche()){const i=g.rows.findIndex(r=>r[0]===chi);if(i>=0)return{g,pos:i+1,r:g.rows[i]};}
  return null;
}
function htmlOra(){
  let h='';
  if(!audioOk)h+=`<div class="sblocca" id="sblocca" data-az="sblocca"><i>🔔</i><span>${T('Tocca qui per attivare suoni e vibrazioni')}</span></div>`;
  const dv=doveri();
  const gioco=dv.find(d=>d.tipo==='gioca'),arb=dv.find(d=>d.tipo==='arbitra');
  if(gioco&&gioco.b.run){
    const [a,b]=gol(gioco.m);
    h+=`<div class="eroe live"><div class="k"><span class="pill live">● LIVE</span> &nbsp;${T('Stai giocando al')} ${esc(dove(gioco.b,gioco.k))}</div>
      <div class="score"><span>${a??0}</span><small style="font-size:1.2rem;opacity:.6">–</small><span>${b??0}</span></div>
      <div class="vs" style="text-align:center">${T('contro')} ${esc(avversario(gioco.m))}</div>
      <div class="min">${esc(gioco.b.ph||'')}${gioco.b.min?` · ${gioco.b.min}'`:''}</div><div class="ctx" style="text-align:center">${esc(gioco.m.ctx)}</div></div>`;
  }else if(gioco){
    const v=visti[gioco.id];
    h+=`<div class="eroe chiama"><div class="k">📣 ${T('Sei atteso al')}</div><div class="big">${esc(dove(gioco.b,gioco.k))}</div>
      <div class="vs">${T('contro')} ${esc(avversario(gioco.m))}</div><div class="ctx">${esc(gioco.m.ctx)}</div>
      ${v?`<div style="margin-top:10px"><span class="pill ok">✓ ${T('visto')}</span></div>`:''}</div>`;
  }
  if(arb){
    const v=visti[arb.id];
    h+=`<div class="eroe arb"><div class="k">🧑‍⚖️ ${arb.b.run?T('Stai arbitrando al'):T('Arbitri al')}</div><div class="big">${esc(dove(arb.b,arb.k))}</div>
      <div class="vs">${esc(arb.m.h)} – ${esc(arb.m.a)}</div><div class="ctx">${esc(arb.m.ctx)}</div>
      ${v?`<div style="margin-top:10px"><span class="pill ok">✓ ${T('visto')}</span></div>`:''}</div>`;
  }
  if(!gioco&&!arb){
    const p=mieProssime()[0];
    if(p)h+=`<div class="eroe"><div class="k">⏭ ${T('Prossima partita')}</div><div class="big" style="font-size:1.6rem">${T('contro')} ${esc(avversario(p))}</div>
      <div class="ctx">${esc(p.ctx)} · ${T('da programmare')}</div></div>`;
    else h+=`<div class="eroe"><div class="k">✔</div><div class="vs" style="margin-top:6px">${partite().some(m=>mia(m))?T('Hai giocato tutte le partite in programma.'):T('Attendi: la Regia sta preparando i prossimi incontri.')}</div></div>`;
  }
  h+=htmlFoto();
  const mc=miaClassifica();
  const ord=n=>LANG==='en'?n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:(n%10<4?n%10:0)]):n+'°';
  if(mc){const r=mc.r;h+=`<div class="card"><div class="pos"><div class="n">${ord(mc.pos)}</div><div><b>${esc(snap.sq?io().team:io().ent)}</b>
    <div class="sm mu">${T('Girone')} ${esc(mc.g.g)} · ${r[1]} ${T('punti')} · ${r[3]}${T('V')} ${r[4]}${T('N')} ${r[5]}${T('P')}</div></div></div></div>`;}
  // impostazioni degli avvisi
  const sicuro=window.isSecureContext;
  const notif=('Notification' in window)&&sicuro?Notification.permission:'no';
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
  h+=`<div class="card"><div class="sect">🔔 ${T('Avvisi attivi')}</div>
    <div class="set"><span>🔊 ${T('Suoni')}</span><button class="sw${cfg.suoni?' on':''}" data-az="suoni" aria-label="${T('Suoni')}"></button></div>
    <div class="set"><span>📳 ${T('Vibrazione')}</span><button class="sw${cfg.vibra&&navigator.vibrate?' on':''}" data-az="vibra" ${navigator.vibrate?'':'disabled'} aria-label="${T('Vibrazione')}"></button></div>
    <div class="set"><span>💡 ${T('Schermo sempre acceso')}</span><button class="sw${cfg.schermo&&('wakeLock' in navigator)?' on':''}" data-az="schermo" aria-label="${T('Schermo sempre acceso')}"></button></div>
    <div class="set"><span>🔔 ${T('Notifiche')}</span><button class="sw${notif==='granted'?' on':''}" data-az="notifiche" ${notif==='denied'?'disabled':''} aria-label="${T('Notifiche')}"></button></div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn sec mini" data-az="prova" style="flex:1">📣 ${T('Prova l’avviso')}</button><button class="btn sec mini" data-az="prova-arb" style="flex:1">🧑‍⚖️ ${T('Prova l’avviso')}</button></div>
    <p class="sm mu" style="margin-top:12px">${T('Tieni l’app aperta con lo schermo acceso: il browser non può suonare da una pagina chiusa.')}${ios?' '+T('Su iPhone la vibrazione non è disponibile e il tasto silenzioso spegne i suoni.'):''}</p>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn sec mini" data-az="cambia" style="flex:1">👤 ${T('Cambia giocatore')}</button><button class="btn sec mini" data-az="esci">${T('Esci')}</button></div></div>`;
  return h;
}
function rigaPartita(m,cl){
  const es=esito(m),b=tabellone(m.id);
  const k=mioTavolo(m);
  let tav='';
  if(snap.sq&&k>=0&&m.sub[k]){const g=m.sub[k],s=lato(m);const mi=s===1?g.h:g.a,lo=s===1?g.a:g.h;const av=s===1?g.pa:g.ph;
    tav=`<small>🎯 ${T('Tavolo')} ${k+1}: ${esc(io().nome)} ${mi??0}–${lo??0} ${esc(av||'')}</small>`;}
  const stato=m.done?'':b?(b.run?`<span class="pill live">● ${T('in corso')}</span>`:`<span class="pill ok">${esc(dove(b,k))}</span>`):`<small>${T('da programmare')}</small>`;
  return `<div class="riga${cl||''}"><span class="es ${es||'X'}">${es?T(es):'·'}</span>
    <div class="tx"><b>${T('contro')} ${esc(avversario(m))}</b><small>${esc(m.ctx)}</small>${tav}</div>
    <div style="text-align:right">${m.done||b&&b.run?`<div class="sc">${esc(punteggio(m))}</div>`:''}${stato}</div></div>`;
}
function htmlDiario(){
  const mie=partite().filter(m=>mia(m)&&m.done).sort((a,b)=>b.ord-a.ord);
  const c={V:0,N:0,P:0,gf:0,gs:0};
  mie.forEach(m=>{const e=esito(m);if(e)c[e]++;const [a,b]=gol(m);c.gf+=a||0;c.gs+=b||0;});
  let h=`<div class="card"><div class="sect">📖 ${T('Diario')} — ${esc(io().nome)}</div>
    <div class="tiles"><div class="tile"><b>${mie.length}</b><span>${T('Giocate')}</span></div><div class="tile V"><b>${c.V}</b><span>${T('Vinte')}</span></div>
    <div class="tile N"><b>${c.N}</b><span>${T('Pari')}</span></div><div class="tile P"><b>${c.P}</b><span>${T('Perse')}</span></div>
    <div class="tile"><b>${c.gf}</b><span>${T('Gol fatti')}</span></div><div class="tile"><b>${c.gs}</b><span>${T('Gol subiti')}</span></div></div></div>`;
  if(snap.sq){
    const t={V:0,N:0,P:0};
    mie.forEach(m=>{const k=mioTavolo(m);if(k<0||!m.sub[k])return;const g=m.sub[k],s=lato(m);const a=s===1?g.h:g.a,b=s===1?g.a:g.h;if(a==null||b==null)return;t[a>b?'V':a<b?'P':'N']++;});
    if(t.V+t.N+t.P)h+=`<div class="card"><div class="sect">🎯 ${T('I tuoi tavoli')}</div><div class="tiles"><div class="tile V"><b>${t.V}</b><span>${T('Vinte')}</span></div><div class="tile N"><b>${t.N}</b><span>${T('Pari')}</span></div><div class="tile P"><b>${t.P}</b><span>${T('Perse')}</span></div></div></div>`;
  }
  const arch=archivio[idTorneo()]||{};const quando=arch.quando||{};
  const ora=t=>t?new Date(t).toLocaleTimeString(LANG,{hour:'2-digit',minute:'2-digit'}):'';
  h+=`<div class="card"><div class="sect">⚽ ${T('Partite giocate')}</div>${mie.length?mie.map(m=>rigaPartita(m).replace('</small>',(quando[m.id]?` · ${ora(quando[m.id])}`:'')+'</small>')).join(''):`<p class="sm mu">${T('Nessuna partita giocata finora.')}</p>`}</div>`;
  const arb=partite().filter(m=>m.done&&arbIdx(m)>=0);
  if(arb.length)h+=`<div class="card"><div class="sect">🧑‍⚖️ ${T('Arbitraggi')}</div>${arb.map(m=>`<div class="riga"><span class="es A">🧑‍⚖️</span><div class="tx"><b>${esc(m.h)} – ${esc(m.a)}</b><small>${esc(m.ctx)}</small></div><div class="sc">${m.hs??0}–${m.as??0}</div></div>`).join('')}</div>`;
  const altri=Object.keys(archivio).filter(k=>k!==idTorneo()).sort((a,b)=>archivio[b].agg-archivio[a].agg);
  if(altri.length){
    h+=`<div class="card"><div class="sect">🗂 ${T('Tornei precedenti')}</div>${altri.map(k=>{const t=archivio[k];const n={V:0,N:0,P:0};(t.partite||[]).forEach(p=>{if(p.es)n[p.es]++;});
      return `<details data-k="arch:${esc(k)}"${aperti.has('arch:'+k)?' open':''}><summary><b style="color:var(--text)">${esc(t.n)}</b> · ${esc(t.date||'')} — ${esc(t.nome)} · ${n.V}${T('V')} ${n.N}${T('N')} ${n.P}${T('P')}</summary>
        ${(t.partite||[]).map(p=>`<div class="riga"><span class="es ${p.es||'X'}">${p.es?T(p.es):'·'}</span><div class="tx"><b>${T('contro')} ${esc(p.avv)}</b><small>${esc(p.ctx)}</small></div><div class="sc">${esc(p.sc)}</div></div>`).join('')}
        ${(t.arbitraggi||[]).length?`<p class="sm mu" style="margin:6px 0">🧑‍⚖️ ${t.arbitraggi.length} ${T('arbitraggi')}</p>`:''}</details>`;}).join('')}</div>`;
  }
  return h;
}
/* classifiche: quelle calcolate dalla Regia; se la Regia è più vecchia e non
   le manda, un conto semplice (3-1-0, differenza reti, gol fatti) */
function classifiche(){
  if(snap.std&&snap.std.length)return snap.std;
  return (snap.groups||[]).map(g=>{
    const s={};const add=n=>s[n]=s[n]||[n,0,0,0,0,0,0,0];
    (g.matches||[]).forEach(m=>{add(m.h);add(m.a);if(!m.done||m.hs==null||m.as==null)return;
      const H=s[m.h],A=s[m.a];H[2]++;A[2]++;H[6]+=m.hs;H[7]+=m.as;A[6]+=m.as;A[7]+=m.hs;
      if(m.hs>m.as){H[1]+=3;H[3]++;A[5]++;}else if(m.hs<m.as){A[1]+=3;A[3]++;H[5]++;}else{H[1]++;A[1]++;H[4]++;A[4]++;}});
    return {g:g.name,rows:Object.values(s).sort((a,b)=>b[1]-a[1]||(b[6]-b[7])-(a[6]-a[7])||b[6]-a[6])};
  });
}
function tabella(g){
  const chi=snap.sq?io().team:io().ent;const q=snap.q||0;
  return `<table class="cl"><thead><tr><th>#</th><th style="text-align:left">${T('squadra')}</th><th>${T('Pt')}</th><th>${T('G')}</th><th>${T('V')}</th><th>${T('N')}</th><th>${T('P')}</th><th>${T('DR')}</th></tr></thead><tbody>
    ${g.rows.map((r,i)=>`<tr class="${r[0]===chi?'me':''}${q&&i<q?' q':''}"><td>${i+1}</td><td class="nm">${esc(r[0])}</td><td class="pt">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]-r[7]>0?'+':''}${r[6]-r[7]}</td></tr>`).join('')}
  </tbody></table>`;
}
function htmlClassifica(){
  const cl=classifiche();const chi=snap.sq?io().team:io().ent;
  const mio=cl.find(g=>g.rows.some(r=>r[0]===chi));
  let h='';
  if(mio)h+=`<div class="card"><div class="sect">🏆 ${T('Girone')} ${esc(mio.g)}</div>${tabella(mio)}${snap.q?`<p class="sm mu" style="margin-top:8px"><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px"></span> ${T('zona qualificazione')}</p>`:''}</div>`;
  const altri=cl.filter(g=>g!==mio);
  if(altri.length)h+=`<div class="card">${altri.map(g=>`<details data-k="g:${esc(g.g)}"${aperti.has('g:'+g.g)?' open':''}><summary><b style="color:var(--text)">${T('Girone')} ${esc(g.g)}</b> · ${g.rows[0]?esc(g.rows[0][0]):''}</summary>${tabella(g)}</details>`).join('')}</div>`;
  const ko=partite().filter(m=>m.kind==='ko'&&mia(m));
  if(ko.length)h+=`<div class="card"><div class="sect">⚔️ ${T('Fase finale')}</div>${ko.map(m=>rigaPartita(m)).join('')}</div>`;
  if(!h)h=`<div class="card"><p class="sm mu">${T('Nessuna classifica disponibile.')}</p></div>`;
  return h;
}
function htmlCalendario(){
  let h='';
  const dv=doveri();
  if(dv.length)h+=`<div class="card"><div class="sect">📍 ${T('Adesso')}</div>${dv.map(d=>d.tipo==='gioca'?rigaPartita(d.m,' ora')
    :`<div class="riga ora"><span class="es A">🧑‍⚖️</span><div class="tx"><b>${esc(d.m.h)} – ${esc(d.m.a)}</b><small>${esc(d.m.ctx)}</small></div><span class="pill ok">${esc(dove(d.b,d.k))}</span></div>`).join('')}</div>`;
  const ora=new Set(dv.map(d=>d.m.id));
  const pr=mieProssime().filter(m=>!ora.has(m.id));
  h+=`<div class="card"><div class="sect">📅 ${T('Prossimi incontri')}</div>${pr.length?pr.map(m=>rigaPartita(m)).join(''):`<p class="sm mu">${T('Nessun impegno in programma.')}</p>`}
    ${(snap.groups||[]).some(g=>g.swiss)?`<p class="sm mu" style="margin-top:8px">${T('Gli accoppiamenti dei turni successivi si decidono man mano.')}</p>`:''}</div>`;
  const pa=partite().filter(m=>!m.done&&arbIdx(m)>=0&&!ora.has(m.id)).sort((a,b)=>a.ord-b.ord);
  if(pa.length)h+=`<div class="card"><div class="sect">🧑‍⚖️ ${T('Prossimi arbitraggi')}</div>${pa.map(m=>`<div class="riga"><span class="es A">🧑‍⚖️</span><div class="tx"><b>${esc(m.h)} – ${esc(m.a)}</b><small>${esc(m.ctx)}</small></div><small class="mu">${T('da programmare')}</small></div>`).join('')}</div>`;
  return h;
}

/* ---------------- la foto per la figurina ----------------
   Scattata al momento (fotocamera frontale) o presa dalla galleria, viene
   rimpicciolita qui (lato lungo 1400 px) e depositata sul server come
   un'iscrizione con foto: la Regia la riconosce dal nome e ne fa la figurina. */
let fotoInfo={};try{fotoInfo=JSON.parse(localStorage.getItem('giocatore_foto')||'{}');}catch(e){}
let fotoInvio=false;
function htmlFoto(){
  const f=fotoInfo[idTorneo()+'|'+io().nome];
  const ora=f&&f.ts?new Date(f.ts).toLocaleTimeString(LANG,{hour:'2-digit',minute:'2-digit'}):'';
  return `<div class="card"><div class="sect">📸 ${T('La tua foto per la figurina')}</div>
    <div style="display:flex;gap:12px;align-items:center">
      ${f&&f.mini?`<img src="${f.mini}" alt="" style="width:74px;height:92px;object-fit:cover;border-radius:12px;border:2px solid rgba(255,255,255,.18);flex:0 0 auto">`:`<div style="width:74px;height:92px;border-radius:12px;border:2px dashed rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:2rem;flex:0 0 auto">👤</div>`}
      <div class="sm mu">${T('Scatta un selfie o scegli una foto dalla galleria: arriva alla Regia, che ne fa la tua figurina.')}<br>${T('Consiglio: viso ben illuminato, sfondo semplice, dal petto in su.')}
        ${fotoInvio?`<div style="color:var(--gold);margin-top:6px">⏳ ${T('Invio della foto…')}</div>`:f&&f.ts?`<div style="color:var(--green);margin-top:6px">✓ ${T('Foto inviata alla Regia')} · ${T('inviata alle')} ${ora}</div>`:''}</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn mini" data-az="foto-scatta" style="flex:1" ${fotoInvio?'disabled':''}>📷 ${T('Scatta')}</button><button class="btn sec mini" data-az="foto-galleria" style="flex:1" ${fotoInvio?'disabled':''}>🖼 ${T('Galleria')}</button></div></div>`;
}
function scegliFoto(fotocamera){
  sbloccaAudio();
  const i=document.createElement('input');i.type='file';i.accept='image/*';
  if(fotocamera)i.setAttribute('capture','user');
  i.onchange=()=>{const file=i.files&&i.files[0];if(file)preparaFoto(file);};
  i.click();
}
function riduci(img,lato,q){
  const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height,k=Math.min(1,lato/Math.max(w,h));
  const c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q);
}
function preparaFoto(file){
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
    URL.revokeObjectURL(url);
    let grande,mini;
    try{grande=riduci(img,1400,.88);mini=riduci(img,220,.8);}catch(e){toast(T('Questa foto non si legge: provane un’altra.'));return;}
    fotoInvio=true;render();
    fetch(api('/api/iscrizione'),{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({key:cfg.key,cognome:io().nome,team:io().team||io().ent||'',img:grande})})
      .then(r=>r.json().catch(()=>({})).then(j=>{if(!r.ok||!j.ok)throw new Error(j.err||r.status);}))
      .then(()=>{fotoInfo[idTorneo()+'|'+io().nome]={ts:Date.now(),mini};try{localStorage.setItem('giocatore_foto',JSON.stringify(fotoInfo));}catch(e){}
        suona('ok');toast('📸 '+T('Foto inviata alla Regia'));})
      .catch(()=>toast(T('Foto non inviata: riprova.')))
      .finally(()=>{fotoInvio=false;render();});
  };
  img.onerror=()=>{URL.revokeObjectURL(url);toast(T('Questa foto non si legge: provane un’altra.'));};
  img.src=url;
}
window.__STC_GIOCATORE_FOTO=preparaFoto;   // per i collaudi

/* ---------------- via ---------------- */
function parti(){monta();avvia();manda();}
if(document.body)parti();else document.addEventListener('DOMContentLoaded',parti);
window.STC_GIOCATORE={doveri:()=>doveri(),daChiamare:()=>daChiamare(),stato:()=>({snap,io:cfg.io,audioOk,inChiamata:inChiamata&&inChiamata.id,coda:coda.length,archivio})};
})();
