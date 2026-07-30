/* =========================================================
   GIFENC — encoder di GIF animate in JavaScript puro
   Nessuna libreria esterna: il programma deve funzionare in sala
   torneo senza rete, quindi niente CDN.

   Uso:
     const g = new GifEnc(larghezza, altezza, {delay: 100, loop: 0});
     g.addFrame(imageDataUint8ClampedRGBA);   // una o più volte
     const blob = g.finish();                 // Blob image/gif

   Come funziona:
   · una tavolozza ADATTIVA di 256 colori ricavata con median cut su un
     campione di pixel di TUTTI i fotogrammi (tavola colore globale);
   · ogni pixel viene poi mappato al colore più vicino, con una cache
     su griglia 5-5-5 bit per non rifare il conto milioni di volte;
   · compressione LZW come da specifica GIF89a.
   ========================================================= */
(function (glob) {
  'use strict';

  /* ---------- flusso di byte ----------
     Un Uint8Array che raddoppia quando serve: il montaggio finale può
     arrivare a decine di MB e un normale array di numeri costerebbe otto
     volte tanto in memoria. */
  function Buf(cap) { this.a = new Uint8Array(cap || 1 << 16); this.n = 0; }
  Buf.prototype._sp = function (k) {
    if (this.n + k <= this.a.length) return;
    var c = this.a.length; while (c < this.n + k) c *= 2;
    var b = new Uint8Array(c); b.set(this.a.subarray(0, this.n)); this.a = b;
  };
  Buf.prototype.b = function (v) { this._sp(1); this.a[this.n++] = v & 255; };
  Buf.prototype.w = function (v) { this._sp(2); this.a[this.n++] = v & 255; this.a[this.n++] = (v >> 8) & 255; };  // little-endian
  Buf.prototype.s = function (t) { this._sp(t.length); for (var i = 0; i < t.length; i++) this.a[this.n++] = t.charCodeAt(i) & 255; };
  Buf.prototype.arr = function (a) { this._sp(a.length); this.a.set(a, this.n); this.n += a.length; };
  Buf.prototype.bytes = function () { return this.a.subarray(0, this.n); };

  /* ---------- median cut: tavolozza adattiva ----------
     Si campionano i pixel (non serve guardarli tutti), si mette
     tutto in una scatola e la si taglia ripetutamente sul canale
     con l'escursione maggiore, finché non si hanno N scatole. */
  function medianCut(campione, nColori) {
    var scatole = [{ px: campione, lv: 0 }];
    function estensione(px) {
      var mn = [255, 255, 255], mx = [0, 0, 0];
      for (var i = 0; i < px.length; i += 3) {
        for (var c = 0; c < 3; c++) {
          var v = px[i + c];
          if (v < mn[c]) mn[c] = v;
          if (v > mx[c]) mx[c] = v;
        }
      }
      return [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    }
    while (scatole.length < nColori) {
      // si taglia la scatola con l'escursione più larga
      var idx = -1, best = -1, bestCh = 0;
      for (var i = 0; i < scatole.length; i++) {
        var px = scatole[i].px;
        if (px.length <= 3) continue;
        var e = estensione(px);
        var ch = e[0] >= e[1] && e[0] >= e[2] ? 0 : (e[1] >= e[2] ? 1 : 2);
        if (e[ch] > best) { best = e[ch]; idx = i; bestCh = ch; }
      }
      if (idx < 0 || best <= 0) break;      // non c'è più niente da tagliare
      var src = scatole[idx].px, n = src.length / 3, ch2 = bestCh;
      var ord = new Array(n);
      for (var k = 0; k < n; k++) ord[k] = k;
      ord.sort(function (a, b) { return src[a * 3 + ch2] - src[b * 3 + ch2]; });
      var mid = n >> 1;
      var A = new Uint8Array(mid * 3), B = new Uint8Array((n - mid) * 3);
      for (var k2 = 0; k2 < mid; k2++) {
        A[k2 * 3] = src[ord[k2] * 3]; A[k2 * 3 + 1] = src[ord[k2] * 3 + 1]; A[k2 * 3 + 2] = src[ord[k2] * 3 + 2];
      }
      for (var k3 = mid; k3 < n; k3++) {
        var o = (k3 - mid) * 3;
        B[o] = src[ord[k3] * 3]; B[o + 1] = src[ord[k3] * 3 + 1]; B[o + 2] = src[ord[k3] * 3 + 2];
      }
      scatole.splice(idx, 1, { px: A }, { px: B });
    }
    // il colore di ogni scatola è la media dei suoi pixel
    var pal = [];
    for (var s = 0; s < scatole.length; s++) {
      var px2 = scatole[s].px, m = px2.length / 3;
      if (!m) { pal.push([0, 0, 0]); continue; }
      var r = 0, g = 0, b = 0;
      for (var j = 0; j < px2.length; j += 3) { r += px2[j]; g += px2[j + 1]; b += px2[j + 2]; }
      pal.push([Math.round(r / m), Math.round(g / m), Math.round(b / m)]);
    }
    while (pal.length < 2) pal.push([0, 0, 0]);
    return pal;
  }

  /* ---------- LZW come da specifica GIF ---------- */
  function lzw(indici, minCode) {
    var out = new Buf();
    var clear = 1 << minCode, eoi = clear + 1;
    var dict, next, size, cur = 0, curBits = 0;
    var blocco = [];
    function flushBlocco() {
      if (!blocco.length) return;
      out.b(blocco.length); out.arr(blocco); blocco = [];
    }
    function emit(code) {
      cur |= code << curBits; curBits += size;
      while (curBits >= 8) {
        blocco.push(cur & 255); cur >>= 8; curBits -= 8;
        if (blocco.length === 255) flushBlocco();
      }
    }
    function reset() {
      dict = new Map(); next = eoi + 1; size = minCode + 1;
    }
    out.b(minCode);
    reset(); emit(clear);
    var prefisso = indici[0];
    for (var i = 1; i < indici.length; i++) {
      var k = indici[i], chiave = prefisso * 4096 + k;
      var trovato = dict.get(chiave);
      if (trovato !== undefined) { prefisso = trovato; continue; }
      emit(prefisso);
      if (next < 4096) {
        dict.set(chiave, next++);
        if (next > (1 << size) && size < 12) size++;
      } else {
        emit(clear); reset();
      }
      prefisso = k;
    }
    emit(prefisso); emit(eoi);
    if (curBits > 0) { blocco.push(cur & 255); if (blocco.length === 255) flushBlocco(); }
    flushBlocco();
    out.b(0);                                  // fine dei sotto-blocchi
    return out.bytes();
  }

  /* ---------- encoder ---------- */
  function GifEnc(w, h, opt) {
    opt = opt || {};
    this.w = w | 0; this.h = h | 0;
    this.delay = Math.max(2, Math.round((opt.delay || 100) / 10));   // centesimi di secondo
    this.loop = opt.loop == null ? 0 : opt.loop;
    this.nColori = Math.min(256, Math.max(4, opt.colors || 128));
    this.frames = [];        // Uint8ClampedArray RGBA
  }
  GifEnc.prototype.addFrame = function (rgba) { this.frames.push(rgba); };
  GifEnc.prototype.count = function () { return this.frames.length; };

  GifEnc.prototype.finish = function () {
    var w = this.w, h = this.h, nPix = w * h;
    if (!this.frames.length) return null;

    /* 1 · campione di pixel da tutti i fotogrammi per la tavolozza */
    var passo = Math.max(1, Math.floor(nPix / 1400));   // ~1400 pixel per fotogramma
    var campione = [];
    for (var f = 0; f < this.frames.length; f++) {
      var d = this.frames[f];
      for (var i = 0; i < nPix; i += passo) {
        var o = i * 4;
        campione.push(d[o], d[o + 1], d[o + 2]);
      }
    }
    var pal = medianCut(new Uint8Array(campione), this.nColori);
    var nPal = pal.length;
    // la tavola colore GIF deve avere una potenza di 2 di voci
    var bits = 1; while ((1 << bits) < nPal) bits++;
    if (bits < 2) bits = 2;
    var slot = 1 << bits;

    /* 2 · cache di mappatura su griglia 5-5-5 (32768 celle) */
    var cache = new Int16Array(32768).fill(-1);
    function vicino(r, g, b) {
      var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      var c = cache[key];
      if (c >= 0) return c;
      var best = 0, bd = 1e9;
      for (var p = 0; p < nPal; p++) {
        var dr = r - pal[p][0], dg = g - pal[p][1], db = b - pal[p][2];
        // pesi percettivi: l'occhio è più sensibile al verde
        var dist = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
        if (dist < bd) { bd = dist; best = p; }
      }
      cache[key] = best;
      return best;
    }

    /* 3 · intestazione + schermo logico + tavola colore globale */
    var out = new Buf();
    out.s('GIF89a');
    out.w(w); out.w(h);
    out.b(0x80 | ((bits - 1) & 7));    // GCT presente, dimensione
    out.b(0); out.b(0);
    for (var p2 = 0; p2 < slot; p2++) {
      var c2 = pal[p2] || [0, 0, 0];
      out.b(c2[0]); out.b(c2[1]); out.b(c2[2]);
    }
    /* ciclo infinito (estensione NETSCAPE) */
    out.b(0x21); out.b(0xFF); out.b(11); out.s('NETSCAPE2.0');
    out.b(3); out.b(1); out.w(this.loop); out.b(0);

    /* 4 · i fotogrammi */
    for (var fr = 0; fr < this.frames.length; fr++) {
      var src = this.frames[fr];
      var idx = new Uint8Array(nPix);
      for (var q = 0; q < nPix; q++) {
        var oo = q * 4;
        idx[q] = vicino(src[oo], src[oo + 1], src[oo + 2]);
      }
      out.b(0x21); out.b(0xF9); out.b(4);
      out.b(0x04);                    // niente trasparenza, non ripulire
      out.w(this.delay); out.b(0); out.b(0);
      out.b(0x2C);
      out.w(0); out.w(0); out.w(w); out.w(h);
      out.b(0);                       // nessuna tavola locale, non interlacciata
      out.arr(lzw(idx, Math.max(2, bits)));
    }
    out.b(0x3B);                      // fine del file
    return new Blob([out.bytes()], { type: 'image/gif' });
  };

  /* =======================================================
     LETTURA E MONTAGGIO
     Al termine della gara la Regia unisce in un solo filmato tutte le
     azioni salienti inviate dall'App Replay. Non serve decomprimere
     niente: si percorrono i blocchi di ogni GIF e si riscrivono in fila,
     portandosi dietro la tavolozza di ciascuna come tavola LOCALE. Gli
     indici dei pixel restano quelli di partenza, quindi i dati compressi
     si copiano tali e quali — è immediato e non perde qualità.
     ======================================================= */
  function parseGif(u8) {
    var p = 6;                                    // salta 'GIF89a'
    var w = u8[p] | (u8[p + 1] << 8), h = u8[p + 2] | (u8[p + 3] << 8), packed = u8[p + 4];
    p += 7;
    var gct = null, gctBits = 0;
    if (packed & 0x80) { gctBits = (packed & 7) + 1; var n = (1 << gctBits) * 3; gct = u8.subarray(p, p + n); p += n; }
    var frames = [], gce = null;
    function saltaSub() { while (p < u8.length) { var l = u8[p++]; if (!l) break; p += l; } }
    while (p < u8.length) {
      var b = u8[p];
      if (b === 0x3B) break;                      // fine del file
      if (b === 0x21) {                           // estensione
        var lab = u8[p + 1];
        if (lab === 0xF9 && u8[p + 2] === 4) {    // controllo grafico
          gce = { packed: u8[p + 3], delay: u8[p + 4] | (u8[p + 5] << 8), tidx: u8[p + 6] };
          p += 8;
        } else { p += 2; saltaSub(); }
        continue;
      }
      if (b === 0x2C) {                           // immagine
        p++;
        var left = u8[p] | (u8[p + 1] << 8), top = u8[p + 2] | (u8[p + 3] << 8);
        var fw = u8[p + 4] | (u8[p + 5] << 8), fh = u8[p + 6] | (u8[p + 7] << 8), fp = u8[p + 8];
        p += 9;
        var lct = null, lctBits = 0;
        if (fp & 0x80) { lctBits = (fp & 7) + 1; var m = (1 << lctBits) * 3; lct = u8.subarray(p, p + m); p += m; }
        var inizio = p;
        p++;                                      // dimensione minima del codice LZW
        saltaSub();
        frames.push({ left: left, top: top, w: fw, h: fh, interlace: !!(fp & 0x40),
                      lct: lct, lctBits: lctBits, dati: u8.subarray(inizio, p), gce: gce });
        gce = null;
        continue;
      }
      p++;                                        // byte inatteso: si avanza per non incastrarsi
    }
    return { w: w, h: h, gct: gct, gctBits: gctBits, frames: frames };
  }

  /* clips: array di Uint8Array (o ArrayBuffer) con le GIF nell'ordine voluto.
     opt.pausa = millisecondi di respiro alla fine di ogni azione. */
  function gifMontage(clips, opt) {
    opt = opt || {};
    var gs = [];
    for (var i = 0; i < clips.length; i++) {
      var c = clips[i];
      if (!(c instanceof Uint8Array)) c = new Uint8Array(c);
      if (c.length < 14 || c[0] !== 0x47 || c[1] !== 0x49 || c[2] !== 0x46) continue;   // non è una GIF
      var g = parseGif(c);
      if (g.frames.length) gs.push(g);
    }
    if (!gs.length) return null;
    var W = 0, H = 0;
    gs.forEach(function (g) { if (g.w > W) W = g.w; if (g.h > H) H = g.h; });

    var out = new Buf(1 << 20);
    out.s('GIF89a'); out.w(W); out.w(H);
    /* una tavola globale minima di due voci: non la useremo (ogni
       fotogramma porta la sua), ma alcuni lettori la pretendono */
    out.b(0x80); out.b(0); out.b(0);
    out.b(0); out.b(0); out.b(0); out.b(255); out.b(255); out.b(255);
    out.b(0x21); out.b(0xFF); out.b(11); out.s('NETSCAPE2.0');
    out.b(3); out.b(1); out.w(opt.loop == null ? 0 : opt.loop); out.b(0);

    var pausa = Math.max(0, Math.round((opt.pausa == null ? 700 : opt.pausa) / 10));
    gs.forEach(function (g) {
      var parziale = g.w < W || g.h < H;          // clip più piccola: si ripulisce lo sfondo
      g.frames.forEach(function (f, fi) {
        var ultimo = fi === g.frames.length - 1;
        var delay = (f.gce && f.gce.delay) || 10;
        if (ultimo && pausa) delay = Math.max(delay, pausa);
        var trasp = f.gce ? (f.gce.packed & 1) : 0;
        out.b(0x21); out.b(0xF9); out.b(4);
        out.b(((parziale ? 2 : 1) << 2) | trasp);
        out.w(delay); out.b((f.gce && f.gce.tidx) || 0); out.b(0);
        out.b(0x2C);
        out.w(f.left); out.w(f.top); out.w(f.w); out.w(f.h);
        var tav = f.lct || g.gct, bits = f.lct ? f.lctBits : g.gctBits;
        if (tav) out.b(0x80 | (f.interlace ? 0x40 : 0) | ((bits - 1) & 7));
        else out.b(f.interlace ? 0x40 : 0);
        if (tav) out.arr(tav);
        out.arr(f.dati);
      });
    });
    out.b(0x3B);
    return new Blob([out.bytes()], { type: 'image/gif' });
  }

  glob.GifEnc = GifEnc;
  glob.gifMontage = gifMontage;
  glob.gifInfo = function (u8) {                  // comodo per diagnosi
    var g = parseGif(u8 instanceof Uint8Array ? u8 : new Uint8Array(u8));
    return { w: g.w, h: g.h, frames: g.frames.length };
  };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));

if (typeof module !== 'undefined' && module.exports)
  module.exports = { GifEnc: globalThis.GifEnc, gifMontage: globalThis.gifMontage, gifInfo: globalThis.gifInfo };
