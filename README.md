# Subbuteo Tournament Center — sito di presentazione

Landing page della versione 5.1, pronta per essere pubblicata su un hosting gratuito
**senza pubblicità**. Autore: Antonio de Masellis.

## Che cosa contiene

| Percorso | Che cos'è |
|---|---|
| `index.html` | La pagina. Un solo file, tutto lo stile e lo script dentro. |
| `assets/` | Immagini (WebP) e font `.woff2` **serviti in locale** |
| `assets/hero.webp` | Rendering fotorealistico del panno e del pallone (Blender/Cycles). **Nessuna miniatura**: il modello 3D del giocatore non regge il confronto con il pezzo originale, quindi è stato tolto dalla pagina (la scena resta in `render/` per eventuali riprese future). |
| `assets/shots/` | Schermate reali del programma, le stesse del manuale |
| `app/` | La **versione dimostrativa che gira nel browser** (link «Apri nel browser») |
| `render/scene.py` | La scena Blender da cui nascono i rendering — rigenerabile |
| `dist/` | I file di installazione con nomi puliti (collegamenti fisici, non copie) |
| `pubblica.sh` | Script che crea il repository, la release con gli installer e attiva le pagine |

**Quasi nessuna richiesta esterna**: niente CDN, niente Google Fonts, niente analitiche,
niente cookie. Le uniche due chiamate in uscita sono il **contatore di visite** e il
**minisondaggio sul prezzo**, che usano il servizio anonimo e gratuito
[Abacus](https://abacus.jasoncameron.dev) (solo numeri interi condivisi, nessun cookie,
nessun dato personale). Se il servizio non risponde, entrambi ripiegano su un conteggio
locale del browser, così la pagina non si rompe mai. Namespace usato: `stc-demasellis`
(nel `<script>` in fondo a `index.html`, sovrascrivibile con `?ns=` per fare prove senza
toccare i numeri veri).

## Come si pubblica (gratis, senza pubblicità)

Le due parti vanno su due servizi diversi perché gli installer pesano ~1,8 GB
in tutto e superano i limiti per file dei servizi di hosting statico:

* **la pagina** → GitHub Pages (o Cloudflare Pages), gratis e senza pubblicità;
* **gli installer** → GitHub Releases, gratis, fino a 2 GB per file, nessun limite
  pratico di traffico.

I collegamenti nella pagina puntano già a
`https://github.com/AdeMasel/subbuteo-tournament-center/releases/download/v5.1.0/…`.

### In un colpo solo

```bash
./pubblica.sh
```

Lo script, con `gh` già autenticato:

1. crea (se non esiste) il repository pubblico `subbuteo-tournament-center`;
2. carica la pagina, gli asset e la demo per browser;
3. crea la release `v5.1.0` e vi allega i cinque installer e il manuale;
4. attiva GitHub Pages sul ramo `main`.

Al termine il sito è su `https://ademasel.github.io/subbuteo-tournament-center/`.

### In alternativa: Cloudflare Pages

Su [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create →
Pages → Connect to Git, scegli il repository, lascia vuoto il comando di build e
imposta la cartella di output su `/`. Anche qui: gratis, senza pubblicità, con CDN
mondiale e dominio personalizzato se un giorno ne vorrai uno.

## Se cambiano i dati

* **Indirizzo email** — cerca `onyxsubbuteo@gmail.com` in `index.html` (compare quattro
  volte: casella da copiare, `mailto:`, FAQ, piè di pagina).
* **Prezzo** — la licenza costa **20 €**. Cerca `20 €` in `index.html` per cambiarlo (compare
  nella tabella prezzo, nell'intro licenza, nei passaggi, nel pulsante hero, nella descrizione
  meta e nel testo del `mailto`).
* **Contatore e sondaggio** — nel `<script>` in fondo: `HIT_BASE=100` è il valore di partenza del
  contatore; `POLL_LAB`/`POLL_EM` sono le fasce del sondaggio sul prezzo. Il servizio è Abacus
  (namespace `stc-demasellis`); i numeri veri partono da zero (contatore mostrato = 100 + reali).
* **QR PayPal** — è `assets/paypal-qr.png` (372×372, ritagliato con la zona di rispetto), mostrato
  a 118 px nel riquadro dell'email e cliccabile verso
  `https://www.paypal.com/qrcodes/p2pqrc/YLFSMQL54CZ7J`, cioè la destinazione letta dal codice
  stesso. Se un giorno cambi QR, sostituisci il file **e** l'indirizzo del link. Se il file manca,
  il blocco si nasconde da solo (`onerror`).
* **Nuova versione** — cerca `5.1.0` (collegamenti agli installer), `v5.1.0` (tag della
  release) e `Versione 5.1` (testi). Vanno rifatti anche i collegamenti fisici in `dist/`.

## Rigenerare i rendering

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python render/scene.py -- --shot pitch --out render/out --samples 400
```

L'inquadratura usata dal sito è `pitch` (panno + pallone + porta). Le altre — `hero`, `ball`, `team`, `box` — includono le miniature modellate in `figure.py` e NON sono usate: il giocatore 3D non è fedele al pezzo originale. La scena è in scala
reale (miniature di 3,5 cm): le luci sono di pochi watt e i diaframmi molto chiusi,
come in una vera macro. Poi si riconvertono in WebP con lo script che sta in fondo a
questo file.

### Conversione delle immagini in WebP

```bash
python3 - <<'PY'
from PIL import Image
def conv(src, dst, maxw, q=82):
    im = Image.open(src).convert('RGB')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=q, method=6)

conv('render/out/pitch.png', 'assets/hero.webp', 1920, 86)
PY
```
