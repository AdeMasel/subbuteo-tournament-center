/* Sfondo vivo della landing: luci da stadio che si muovono piano, le linee del campo
   appena accennate (con un filo di parallasse allo scorrimento), pulviscolo dorato e,
   ogni tanto, un pallone che attraversa la pagina rotolando.
   - rispetta «Pausa effetti» (html.night-paused) e prefers-reduced-motion: un fotogramma fermo;
   - si ferma quando la scheda non è visibile; al massimo 30 fps; meno particelle sui telefoni. */
(()=>{'use strict';
  const cv=document.createElement('canvas');cv.id='sfondo-vivo';cv.setAttribute('aria-hidden','true');
  document.body.prepend(cv);
  const cx=cv.getContext('2d',{alpha:true});if(!cx)return;
  const rid=matchMedia('(prefers-reduced-motion: reduce)');
  const fermo=()=>rid.matches||document.documentElement.classList.contains('night-paused');
  let W=0,H=0,DPR=1,piccolo=false;
  // colori della pelle «atelier»: verde campo, oro, crema
  const LUCI=[
    {c:'51,115,90',r:.55,x:.12,y:.18,vx:.034,vy:.022,a:.36},
    {c:'217,181,102',r:.45,x:.86,y:.32,vx:-.028,vy:.031,a:.42},
    {c:'51,115,90',r:.40,x:.70,y:.85,vx:.025,vy:-.024,a:.30},
    {c:'255,253,247',r:.50,x:.35,y:.60,vx:-.019,vy:.016,a:.40}];
  let polvere=[],palla=null,prossimaPalla=4000,ultimo=0,t0=performance.now(),raf=0;
  function misura(){
    DPR=Math.min(1.5,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;piccolo=W<700;
    cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cx.setTransform(DPR,0,0,DPR,0,0);
    const n=piccolo?26:60;polvere=Array.from({length:n},()=>nuovaPolvere(true));
  }
  function nuovaPolvere(ovunque){
    return {x:Math.random()*W,y:ovunque?Math.random()*H:H+10,r:.6+Math.random()*1.8,v:6+Math.random()*14,
      f:Math.random()*Math.PI*2,a:.25+Math.random()*.45};
  }
  function luci(t){
    for(const l of LUCI){
      const x=((l.x+Math.sin(t*l.vx)*.18)%1)*W,y=((l.y+Math.cos(t*l.vy)*.15)%1)*H,r=l.r*Math.max(W,H);
      const g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${l.c},${l.a})`);g.addColorStop(1,`rgba(${l.c},0)`);
      cx.fillStyle=g;cx.fillRect(0,0,W,H);
    }
  }
  function campo(t){
    // linee del campo, larghe come la pagina; si spostano di un terzo dello scorrimento
    const sc=(window.scrollY||0)*.33,lw=Math.max(W*.9,700),lh=lw*.62,x0=(W-lw)/2;
    let y0=((-sc)%(lh+260));if(y0>0)y0-=lh+260;
    cx.save();cx.strokeStyle=`rgba(51,115,90,${.17+.05*Math.sin(t*.5)})`;cx.lineWidth=1.6;
    for(let y=y0;y<H+lh;y+=lh+260){
      cx.strokeRect(x0,y,lw,lh);
      cx.beginPath();cx.moveTo(x0,y+lh/2);cx.lineTo(x0+lw,y+lh/2);cx.stroke();
      cx.beginPath();cx.arc(W/2,y+lh/2,lh*.15,0,Math.PI*2);cx.stroke();
      const aw=lw*.44,ah=lh*.17;cx.strokeRect(W/2-aw/2,y,aw,ah);cx.strokeRect(W/2-aw/2,y+lh-ah,aw,ah);
    }
    cx.restore();
  }
  function pulviscolo(dt){
    for(const p of polvere){
      if(dt){p.y-=p.v*dt;p.f+=dt*.8;p.x+=Math.sin(p.f)*.25;if(p.y<-10)Object.assign(p,nuovaPolvere(false));}
      cx.fillStyle=`rgba(201,154,67,${p.a})`;cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);cx.fill();
    }
  }
  function pallone(dt,ora){
    if(!palla&&ora>prossimaPalla){
      const da=Math.random()<.5,y=H*(.25+Math.random()*.6);
      palla={x:da?-40:W+40,y,vx:(da?1:-1)*(120+Math.random()*90),vy:(Math.random()-.5)*30,r:piccolo?7:10,ang:0,scia:[]};
    }
    if(!palla)return;
    if(dt){palla.x+=palla.vx*dt;palla.y+=palla.vy*dt;palla.ang+=palla.vx*dt/palla.r;
      palla.scia.push([palla.x,palla.y]);if(palla.scia.length>18)palla.scia.shift();}
    palla.scia.forEach(([x,y],i)=>{cx.fillStyle=`rgba(51,115,90,${i/palla.scia.length*.12})`;cx.beginPath();cx.arc(x,y,palla.r*(i/palla.scia.length),0,Math.PI*2);cx.fill();});
    cx.save();cx.translate(palla.x,palla.y);cx.rotate(palla.ang);
    cx.fillStyle='rgba(255,255,255,.85)';cx.strokeStyle='rgba(36,56,47,.45)';cx.lineWidth=1.2;
    cx.beginPath();cx.arc(0,0,palla.r,0,Math.PI*2);cx.fill();cx.stroke();
    cx.fillStyle='rgba(36,56,47,.45)';for(let k=0;k<5;k++){const a=k*Math.PI*2/5;cx.beginPath();cx.arc(Math.cos(a)*palla.r*.55,Math.sin(a)*palla.r*.55,palla.r*.2,0,Math.PI*2);cx.fill();}
    cx.restore();
    if(palla.x<-60||palla.x>W+60){palla=null;prossimaPalla=ora+6000+Math.random()*7000;}
  }
  function disegna(ora){
    const t=(ora-t0)/1000,dt=ultimo?Math.min(.1,(ora-ultimo)/1000):0;ultimo=ora;
    cx.clearRect(0,0,W,H);luci(t);campo(t);pulviscolo(fermo()?0:dt);if(!fermo())pallone(dt,ora);
  }
  function giro(ora){
    raf=0;if(document.hidden||fermo())return;
    if(ora-ultimo>=33)disegna(ora);   // ~30 fps
    raf=requestAnimationFrame(giro);
  }
  function avvia(){ultimo=0;disegna(performance.now());if(!raf&&!fermo()&&!document.hidden)raf=requestAnimationFrame(giro);}
  misura();avvia();
  addEventListener('resize',()=>{misura();avvia();});
  addEventListener('scroll',()=>{if(fermo())disegna(performance.now());},{passive:true});
  document.addEventListener('visibilitychange',avvia);
  rid.addEventListener&&rid.addEventListener('change',avvia);
  // «Pausa effetti» cambia la classe di <html>: si riparte o ci si ferma su un fotogramma
  new MutationObserver(avvia).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
})();
