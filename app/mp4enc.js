/* =========================================================
   mp4enc.js — le clip dell'App Replay in MP4 (H.264)
   ---------------------------------------------------------
   Sostituisce l'encoder GIF: stessa idea (gli ultimi secondi sono sempre
   pronti), risultato molto migliore. A 720p una clip di otto secondi pesa
   meno di quanto pesasse la GIF a 256×144.

   Perché non basta MediaRecorder. Serve «gli ultimi 8 secondi già passati»:
   un MediaRecorder produce un file dal momento in cui lo avvii, e tagliarne
   la coda senza ricodificare non si può. Qui invece l'encoder gira sempre e
   i pacchetti compressi restano in un anello: quando si preme REC si prende
   la coda dell'anello a partire dal fotogramma chiave più vecchio utile.
   Un secondo di 720p compresso sta in poche decine di kB, quindi l'anello
   costa memoria trascurabile (mentre 8 secondi di fotogrammi RGBA grezzi a
   720p sarebbero stati 236 MB: la strada della GIF non scalava).

   Niente librerie: il contenitore MP4 è scritto qui sotto a mano, perché il
   programma deve funzionare senza rete.
   ========================================================= */
(function (glob) {
'use strict';

const disponibile = typeof glob.VideoEncoder === 'function' &&
                    typeof glob.VideoFrame === 'function';

/* ---------------------------------------------------------------- scrittura
   Un MP4 è un albero di «box»: quattro byte di lunghezza, quattro di nome,
   poi il contenuto. Ne servono pochi per un file con una sola traccia video. */
function u32(n){ return [ (n>>>24)&255, (n>>>16)&255, (n>>>8)&255, n&255 ]; }
function u16(n){ return [ (n>>>8)&255, n&255 ]; }
function txt(s){ return Array.from(s, c => c.charCodeAt(0)); }
function box(nome, ...parti){
  const corpo = [].concat(...parti);
  return [].concat(u32(corpo.length + 8), txt(nome), corpo);
}
function fullbox(nome, ver, flag, ...parti){
  return box(nome, [ver, (flag>>>16)&255, (flag>>>8)&255, flag&255], ...parti);
}

/* matrice unitaria richiesta da tkhd/mvhd */
const MATRICE = [].concat(u32(0x10000),u32(0),u32(0), u32(0),u32(0x10000),u32(0),
                         u32(0),u32(0),u32(0x40000000));

/**
 * Costruisce il file MP4.
 * @param campioni [{dati:Uint8Array, durata:int, chiave:bool}]  in scala TIMESCALE
 * @param avcc     Uint8Array  configurazione del decodificatore (avcC)
 */
function scriviMp4(campioni, avcc, larghezza, altezza, timescale){
  const durata = campioni.reduce((a, c) => a + c.durata, 0);
  const dimensioni = campioni.map(c => c.dati.length);
  const totale = dimensioni.reduce((a, b) => a + b, 0);

  /* stts: durate raggruppate per valore uguale (di norma una sola voce) */
  const stts = [];
  campioni.forEach(c => {
    const u = stts[stts.length - 1];
    if (u && u[1] === c.durata) u[0]++; else stts.push([1, c.durata]);
  });
  /* stss: quali campioni sono fotogrammi chiave */
  const chiavi = [];
  campioni.forEach((c, i) => { if (c.chiave) chiavi.push(i + 1); });

  const stbl = box('stbl',
    box('stsd', u32(0), u32(1),
      box('avc1',
        [0,0,0,0,0,0], u16(1),                    // reserved + data_reference_index
        u16(0), u16(0), u32(0),u32(0),u32(0),     // pre_defined / reserved
        u16(larghezza), u16(altezza),
        u32(0x00480000), u32(0x00480000),         // 72 dpi
        u32(0), u16(1),
        [32].concat(new Array(31).fill(0)),       // compressorname (32 byte)
        u16(24), u16(0xFFFF),
        box('avcC', Array.from(avcc)))),
    fullbox('stts', 0, 0, u32(stts.length), [].concat(...stts.map(([n, d]) => [].concat(u32(n), u32(d))))),
    chiavi.length && chiavi.length !== campioni.length
      ? fullbox('stss', 0, 0, u32(chiavi.length), [].concat(...chiavi.map(u32)))
      : [],
    // un campione per «chunk»: la tabella è banale e la scrittura resta lineare
    fullbox('stsc', 0, 0, u32(1), u32(1), u32(1), u32(1)),
    fullbox('stsz', 0, 0, u32(0), u32(dimensioni.length), [].concat(...dimensioni.map(u32))),
    fullbox('stco', 0, 0, u32(dimensioni.length), [].concat(...new Array(dimensioni.length).fill(0).map(u32)))
  );

  const moov = box('moov',
    fullbox('mvhd', 0, 0, u32(0), u32(0), u32(timescale), u32(durata),
      u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0), MATRICE,
      u32(0),u32(0),u32(0),u32(0),u32(0),u32(0), u32(2)),
    box('trak',
      fullbox('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(durata),
        u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), MATRICE,
        u32(larghezza << 16), u32(altezza << 16)),
      box('mdia',
        fullbox('mdhd', 0, 0, u32(0), u32(0), u32(timescale), u32(durata), u16(0x55C4), u16(0)),
        fullbox('hdlr', 0, 0, u32(0), txt('vide'), u32(0),u32(0),u32(0), txt('Subbuteo Replay\0')),
        box('minf',
          fullbox('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)),
          box('dinf', fullbox('dref', 0, 0, u32(1), fullbox('url ', 0, 1))),
          stbl))));

  const ftyp = box('ftyp', txt('isom'), u32(0x200), txt('isom'), txt('iso2'), txt('avc1'), txt('mp41'));

  /* il mdat va dopo il moov: solo ora si conoscono gli scarti reali dei
     campioni, che vanno riscritti dentro stco */
  const inizioDati = ftyp.length + moov.length + 8;
  const file = new Uint8Array(inizioDati + totale);
  file.set(ftyp, 0);
  file.set(moov, ftyp.length);
  file.set(u32(totale + 8), ftyp.length + moov.length);
  file.set(txt('mdat'), ftyp.length + moov.length + 4);

  // posizione della tabella stco dentro il file, per correggerne le voci
  const posStco = ftyp.length + trovaStco(moov);
  const vista = new DataView(file.buffer);
  let off = inizioDati;
  campioni.forEach((c, i) => {
    file.set(c.dati, off);
    vista.setUint32(posStco + i * 4, off);
    off += c.dati.length;
  });
  return new Blob([file], { type: 'video/mp4' });
}
/** scarto, dentro moov, del primo elemento della tabella stco */
function trovaStco(moov){
  for (let i = 0; i < moov.length - 4; i++)
    if (moov[i] === 115 && moov[i+1] === 116 && moov[i+2] === 99 && moov[i+3] === 111) // 'stco'
      return i + 4 /* nome */ + 4 /* versione+flag */ + 4 /* numero voci */;
  throw new Error('stco non trovato');
}

/* ---------------------------------------------------------------- registratore
   Tiene l'encoder acceso e conserva gli ultimi pacchetti compressi. */
function Registratore(opz){
  const o = Object.assign({ larghezza: 1280, altezza: 720, fps: 15, secondi: 8,
                            bitrate: 2_500_000, gopSec: 2 }, opz || {});
  const TIMESCALE = 90000;                       // la scala classica del video
  const durataCampione = Math.round(TIMESCALE / o.fps);
  const maxPacchetti = Math.ceil(o.fps * (o.secondi + o.gopSec + 1));

  let enc = null, avcc = null, anello = [], n = 0, errore = null;

  function avvia(){
    if (enc) return;
    anello = []; n = 0; errore = null;
    enc = new glob.VideoEncoder({
      output: (chunk, meta) => {
        if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcc)
          avcc = new Uint8Array(meta.decoderConfig.description);
        const dati = new Uint8Array(chunk.byteLength);
        chunk.copyTo(dati);
        anello.push({ dati, chiave: chunk.type === 'key', durata: durataCampione });
        if (anello.length > maxPacchetti) anello.shift();
      },
      error: e => { errore = e; }
    });
    enc.configure({
      codec: 'avc1.42E01F',                      // Baseline 3.1: la accettano tutti
      width: o.larghezza, height: o.altezza,
      bitrate: o.bitrate, framerate: o.fps,
      avc: { format: 'avc' },                    // avcC, non Annex-B: è ciò che vuole l'MP4
      latencyMode: 'realtime'
    });
  }

  function aggiungi(sorgente){
    if (!enc || enc.state !== 'configured') return;
    const chiave = (n % Math.round(o.fps * o.gopSec)) === 0;
    const frame = new glob.VideoFrame(sorgente, {
      timestamp: Math.round(n * 1e6 / o.fps), duration: Math.round(1e6 / o.fps)
    });
    try { enc.encode(frame, { keyFrame: chiave }); } finally { frame.close(); }
    n++;
  }

  /** i pacchetti degli ultimi `secondi`, a partire da un fotogramma chiave */
  function coda(){
    const voluti = Math.round(o.fps * o.secondi);
    let da = Math.max(0, anello.length - voluti);
    while (da > 0 && !anello[da].chiave) da--;    // indietro fino alla chiave
    if (!anello[da] || !anello[da].chiave){
      da = anello.findIndex(c => c.chiave);
      if (da < 0) return [];
    }
    return anello.slice(da);
  }

  return {
    get pronto(){ return !!(enc && avcc && coda().length > o.fps); },
    get secondiInMemoria(){ return coda().length / o.fps; },
    get errore(){ return errore; },
    avvia,
    aggiungi,
    ferma(){ try { enc && enc.state !== 'closed' && enc.close(); } catch(e){} enc = null; anello = []; },
    /** Blob MP4 con gli ultimi secondi. Va atteso: l'encoder lavora in coda. */
    async clip(){
      if (!enc) return null;
      await enc.flush();
      const c = coda();
      if (!c.length || !avcc) return null;
      return scriviMp4(c, avcc, o.larghezza, o.altezza, TIMESCALE);
    }
  };
}

/* ---------------------------------------------------------------- montaggio
   Le clip nascono tutte dallo stesso encoder: stessa avcC, stessa misura.
   Rimetterle in fila non richiede di ricomprimerle — si rileggono i campioni
   di ciascuna e si riscrive un solo file. */
function leggiBox(dv, da, fine){
  const out = [];
  let p = da;
  while (p + 8 <= fine){
    const len = dv.getUint32(p);
    const nome = String.fromCharCode(dv.getUint8(p+4), dv.getUint8(p+5), dv.getUint8(p+6), dv.getUint8(p+7));
    if (len < 8 || p + len > fine) break;
    out.push({ nome, da: p + 8, fine: p + len });
    p += len;
  }
  return out;
}
function cerca(dv, da, fine, percorso){
  let liv = leggiBox(dv, da, fine), trovato = null;
  for (const nome of percorso){
    trovato = liv.find(b => b.nome === nome);
    if (!trovato) return null;
    liv = leggiBox(dv, trovato.da, trovato.fine);
  }
  return trovato;
}
/** estrae campioni e avcC da un MP4 scritto da questo modulo */
function leggiMp4(buf){
  const dv = new DataView(buf);
  const stbl = cerca(dv, 0, buf.byteLength, ['moov','trak','mdia','minf','stbl']);
  if (!stbl) throw new Error('non è un MP4 leggibile');
  const dentro = leggiBox(dv, stbl.da, stbl.fine);
  const b = n => dentro.find(x => x.nome === n);

  const avc = cerca(dv, stbl.da, stbl.fine, ['stsd']);
  let avcc = null;
  if (avc){
    // stsd → avc1 → avcC
    const s = leggiBox(dv, avc.da + 8, avc.fine)[0];
    if (s) { const c = leggiBox(dv, s.da + 78, s.fine).find(x => x.nome === 'avcC');
             if (c) avcc = new Uint8Array(buf.slice(c.da, c.fine)); }
  }
  const stsz = b('stsz'), stco = b('stco'), stts = b('stts'), stss = b('stss');
  if (!stsz || !stco) throw new Error('tabelle mancanti');
  const nCamp = dv.getUint32(stsz.da + 8);
  const dim = [], off = [], dur = [];
  for (let i = 0; i < nCamp; i++) dim.push(dv.getUint32(stsz.da + 12 + i*4));
  for (let i = 0; i < nCamp; i++) off.push(dv.getUint32(stco.da + 8 + i*4));
  const nStts = dv.getUint32(stts.da + 4);
  for (let i = 0; i < nStts; i++){
    const c = dv.getUint32(stts.da + 8 + i*8), d = dv.getUint32(stts.da + 12 + i*8);
    for (let k = 0; k < c; k++) dur.push(d);
  }
  const chiavi = new Set();
  if (stss){ const nc = dv.getUint32(stss.da + 4);
             for (let i = 0; i < nc; i++) chiavi.add(dv.getUint32(stss.da + 8 + i*4)); }

  const campioni = [];
  for (let i = 0; i < nCamp; i++)
    campioni.push({ dati: new Uint8Array(buf.slice(off[i], off[i] + dim[i])),
                    durata: dur[i] || 6000,
                    chiave: stss ? chiavi.has(i + 1) : true });
  const tkhd = cerca(dv, 0, buf.byteLength, ['moov','trak','tkhd']);
  const larghezza = tkhd ? dv.getUint32(tkhd.da + 76) >>> 16 : 1280;
  const altezza   = tkhd ? dv.getUint32(tkhd.da + 80) >>> 16 : 720;
  const mdhd = cerca(dv, 0, buf.byteLength, ['moov','trak','mdia','mdhd']);
  const timescale = mdhd ? dv.getUint32(mdhd.da + 12) : 90000;
  return { campioni, avcc, larghezza, altezza, timescale };
}
/**
 * Rimette in fila più clip in un solo MP4.
 * @param buffers ArrayBuffer[]  le clip nell'ordine voluto
 * @param pausa   millisecondi di fermo immagine fra una clip e l'altra
 */
function montaMp4(buffers, pausa){
  const letti = buffers.map(leggiMp4).filter(x => x.campioni.length);
  if (!letti.length) return null;
  const base = letti[0];
  const tutti = [];
  letti.forEach((m, i) => {
    m.campioni.forEach(c => tutti.push(c));
    if (pausa > 0 && i < letti.length - 1 && tutti.length){
      // la pausa si ottiene allungando l'ultimo campione: nessun fotogramma in più
      tutti[tutti.length - 1] = Object.assign({}, tutti[tutti.length - 1],
        { durata: tutti[tutti.length - 1].durata + Math.round(base.timescale * pausa / 1000) });
    }
  });
  return scriviMp4(tutti, base.avcc, base.larghezza, base.altezza, base.timescale);
}

glob.MP4 = { disponibile, Registratore, montaMp4, leggiMp4, scriviMp4 };
})(typeof window !== 'undefined' ? window : globalThis);
