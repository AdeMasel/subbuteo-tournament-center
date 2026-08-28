/* =========================================================
   "LA LEGGE" — motore di consultazione dei regolamenti (offline)
   Indicizzazione BM25 + espansione sinonimi sul dominio arbitrale.
   Usato sia dalla Regia (gestionale) sia dall'App Campo (mobile).
   Dipende da window.REGOLAMENTI (regolamenti.js).
   ========================================================= */
(function(){
'use strict';
const STOP=new Set('a ad al allo ai agli alla alle agli agl anzi avere che chi ci co coi col come con contro cui da dal dallo dai dagli dalla dalle degli dei del della delle dello di due e ed egli ecco essere fa fare fino fra gli ha hai hanno ho i il in io la le li lo loro ma me mi ne nei negli nel nella nelle nello no noi non nostra nostro o od ogni per può puo qua quale quali quando quanto quel quella quelle quelli quello questa queste questi questo qui se senza si sia siamo sono su sua sue sugli sui sul sulla sulle sullo suo suoi ti tra tu tua tue tuo tuoi tutti tutto un una uno vi voi come essere ogni ove oppure poi anche solo stato stata essere viene deve puo essere'.split(/\s+/));
const SYN={
  'espulsione':'espulso espulsione cartellino rosso condotta','espulso':'espulsione cartellino rosso',
  'ammonizione':'ammonizione cartellino giallo condotta','ammonito':'ammonizione cartellino giallo',
  'cartellino':'cartellino condotta scorretta sanzione',
  'quanto':'durata minuti tempo','dura':'durata minuti tempo','durata':'durata minuti tempo tempi',
  'tempo':'tempo tempi durata minuti supplementari','supplementare':'supplementari tempi',
  'rigore':'rigore calcio dischetto','rigori':'rigore tiri piazzati shootout',
  'punizione':'punizione calcio fallo','fallo':'fallo punizione infrazione',
  'fuorigioco':'fuorigioco offside','angolo':'angolo corner','corner':'corner angolo',
  'rimessa':'rimessa laterale fondo','laterale':'rimessa laterale',
  'gol':'rete segnatura gol','rete':'rete segnatura','goal':'rete segnatura gol',
  'portiere':'portiere portierino','portierino':'portiere riserva portierino',
  'tiri':'tiri piazzati rigori','piazzati':'tiri piazzati shootout','shootout':'tiri piazzati shoot out',
  'arbitro':'arbitro guardalinee direzione','back':'back vantaggio',
  'tocco':'tocco colpo manipolazione','colpo':'colpo tocco manipolazione flick',
  'miniatura':'miniatura figura base','miniature':'miniature figure',
  'palla':'palla pallina','tempi':'tempi durata minuti','minuti':'minuti durata tempo',
  'sostituzione':'sostituzione cambio riserva','distanza':'distanza posizionamento cm',
};
/* --- edizione inglese: stopword, sinonimi e stemming dedicati (regolamenti_en.js) --- */
const STOP_EN=new Set('a an and are as at be been but by can could do does for from had has have he her him his how i if in into is it its may might must not of on or our shall she should so than that the their them then there these they this those to was we were what when where which while who whom why will with would you your'.split(/\s+/));
const SYN_EN={
  'sending':'sending off red card expulsion','expulsion':'red card sending off','red':'red card expulsion',
  'booking':'yellow card caution','caution':'yellow card booking','yellow':'yellow card caution','card':'card caution misconduct penalty',
  'long':'duration minutes time','duration':'duration minutes time halves','time':'time halves duration minutes extra',
  'extra':'extra time halves','half':'half halves duration','penalty':'penalty spot kick shootout',
  'penalties':'penalty shootout shots','shootout':'shootout penalty shots','free':'free flick foul',
  'foul':'foul infringement free flick','offside':'offside','corner':'corner kick','throw':'throw in',
  'goal':'goal score net','score':'goal score','keeper':'goalkeeper rod','goalkeeper':'goalkeeper keeper rod',
  'referee':'referee linesman direction','back':'back advantage','flick':'flick shot touch',
  'touch':'touch flick handling','figure':'figure base miniature','figures':'figures bases',
  'ball':'ball possession','minutes':'minutes duration time','substitution':'substitution change reserve',
  'distance':'distance positioning cm','shooting':'shooting area zone',
};
function stemEn(w){return w.replace(/(ingly|edly|ing|ed|es|s|ly)$/,'')||w;}
function isEn(){return (window.REGOLAMENTI&&window.REGOLAMENTI.lang)==='en';}
function norm(s){return String(s||'').toLowerCase().replace(/[’']/g,"'").replace(/[àá]/g,'a').replace(/[èé]/g,'e').replace(/[ìí]/g,'i').replace(/[òó]/g,'o').replace(/[ùú]/g,'u');}
function toks(s){const stop=isEn()?STOP_EN:STOP;return norm(s).replace(/[^a-z0-9'\s]/g,' ').split(/\s+/).filter(w=>w.length>1&&!stop.has(w));}
function stemIt(w){return w.replace(/(zione|zioni|mente|amento|amenti|ando|endo|are|ere|ire|ato|ata|ati|ate|ito|ita|iti|ite|oso|osi|osa|ose|i|e|o|a)$/,'').slice(0,Math.max(4,w.length-4)>0?undefined:w.length)||w;}
function stem(w){return isEn()?stemEn(w):stemIt(w);}

let ENG=null;
function build(){
  if(ENG&&ENG.data===window.REGOLAMENTI)return ENG;   // ricostruisce se cambia lingua
  ENG=null;
  const data=window.REGOLAMENTI;
  if(!data||!data.docs)return null;
  const passages=[]; const df=Object.create(null); let totLen=0;
  data.docs.forEach(doc=>{
    doc.passaggi.forEach(p=>{
      const id=passages.length;
      const raw=`${p.c} ${p.s} ${p.t}`;
      const tf=Object.create(null); const tk=toks(raw);
      tk.forEach(w=>{const st=stem(w);tf[st]=(tf[st]||0)+1;});
      const len=tk.length; totLen+=len;
      Object.keys(tf).forEach(t=>{df[t]=(df[t]||0)+1;});
      passages.push({id,doc:doc.id,r:p.r,c:p.c,s:p.s,t:p.t,tf,len,ntext:norm(raw)});
    });
  });
  const N=passages.length, avg=totLen/Math.max(1,N);
  ENG={data,passages,df,N,avg};
  return ENG;
}
function expand(q){
  const syn=isEn()?SYN_EN:SYN;
  const base=toks(q); const out=[];
  base.forEach(w=>{out.push(w); if(syn[w])toks(syn[w]).forEach(x=>out.push(x));});
  return out.map(stem);
}
function search(query,docId,limit){
  const e=build(); if(!e)return[];
  const qs=expand(query); if(!qs.length)return[];
  const nq=norm(query).trim();
  const k1=1.5,b=0.75;
  const uniq=[...new Set(qs)];
  const scored=[];
  e.passages.forEach(p=>{
    if(docId&&p.doc!==docId)return;
    let s=0,hit=0;
    uniq.forEach(t=>{
      const f=p.tf[t]; if(!f)return; hit++;
      const idf=Math.log(1+(e.N-e.df[t]+0.5)/(e.df[t]+0.5));
      s+=idf*(f*(k1+1))/(f+k1*(1-b+b*p.len/e.avg));
    });
    if(!s)return;
    if(nq.length>4&&p.ntext.indexOf(nq)>=0)s+=6;          // frase esatta
    if(hit===uniq.length&&uniq.length>1)s+=1.5;           // copre tutti i termini
    scored.push({...p,score:s,hit});
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,limit||12);
}
function docName(id){const d=(window.REGOLAMENTI.docs||[]).find(x=>x.id===id);return d?d.nome:id;}
function ask(query,docId){
  const res=search(query,docId,8);
  if(!res.length)return{best:null,related:[],spoken:''};
  const best=res[0];
  const dn=docName(best.doc);
  const spoken=isEn()
    ?`According to the ${dn} rules, ${best.r?'rule '+best.r+'. ':''}${best.t}`
    :`Secondo il regolamento ${dn}, ${best.r?'regola '+best.r+'. ':''}${best.t}`;
  return{best,related:res.slice(1,5),spoken};
}
window.Legge={
  build,
  ready(cb){ if(window.REGOLAMENTI){build();cb&&cb(true);} else cb&&cb(false); },
  docs(){ const e=build(); if(!e)return[]; return e.data.docs.map(d=>({id:d.id,nome:d.nome,ente:d.ente,fonte:d.fonte,col:d.col,n:d.passaggi.length})); },
  chapters(docId){
    const d=(window.REGOLAMENTI.docs||[]).find(x=>x.id===docId); if(!d)return[];
    const by={};const order=[];
    d.passaggi.forEach(p=>{const key=p.c||'—';if(!by[key]){by[key]=[];order.push(key);}by[key].push(p);});
    return order.map(k=>({title:k,passages:by[k]}));
  },
  search, ask, docName
};
})();
