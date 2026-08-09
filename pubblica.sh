#!/bin/bash
# Pubblica il sito su GitHub Pages e gli installer su GitHub Releases.
# Richiede: gh già autenticato (gh auth status).
set -euo pipefail

UTENTE="AdeMasel"
REPO="subbuteo-tournament-center"
TAG="v6.0.0"
QUI="$(cd "$(dirname "$0")" && pwd)"
cd "$QUI"

echo "▸ Verifico gh…"
gh auth status >/dev/null

# ------------------------------------------------------------------ repository
if gh repo view "$UTENTE/$REPO" >/dev/null 2>&1; then
  echo "▸ Repository $UTENTE/$REPO già esistente."
else
  echo "▸ Creo il repository pubblico $UTENTE/$REPO…"
  gh repo create "$UTENTE/$REPO" --public \
    --description "Subbuteo Tournament Center — il gestionale per i tornei di Calcio da Tavolo"
fi

# ------------------------------------------------------------------ sito
if [ ! -d .git ]; then
  git init -q
  git branch -M main
  git remote add origin "https://github.com/$UTENTE/$REPO.git"
fi

cat > .gitignore <<'EOF'
dist/
render/out/
.claude/
.DS_Store
EOF

git add -A
git commit -q -m "Sito di presentazione di Subbuteo Tournament Center 6.0" || echo "▸ Niente da committare."
git push -u origin main

echo "▸ Attivo GitHub Pages…"
gh api -X POST "repos/$UTENTE/$REPO/pages" \
  -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
  || echo "▸ Pages risulta già attivo."

# ------------------------------------------------------------------ release
if gh release view "$TAG" --repo "$UTENTE/$REPO" >/dev/null 2>&1; then
  echo "▸ La release $TAG esiste già: aggiorno gli allegati."
else
  echo "▸ Creo la release $TAG…"
  gh release create "$TAG" --repo "$UTENTE/$REPO" \
    --title "Subbuteo Tournament Center 6.0" \
    --notes "Versione dimostrativa per macOS, Windows e Linux.

Il programma si installa in versione DIMOSTRATIVA: torneo a girone unico, tabelloni
dal vivo, classifiche, Presentazione e stima della durata. Per sbloccare tutte le
funzioni serve un codice di attivazione valido per il singolo dispositivo — le
istruzioni sono su https://$(echo $UTENTE | tr '[:upper:]' '[:lower:]').github.io/$REPO/#licenza

Novità della 6.0: le figurine dei partecipanti. Ogni giocatore diventa una figurina
come quelle dell'album — il volto fotografato montato sul mezzobusto con la maglia della
sua squadra, il cognome in grande, lo stemma e il nome della squadra. Un tasto Genera la
compone e la manda al libro dei ricordi; tutto offline, sul proprio computer.

Dentro il programma c'è ora un catalogo di oltre 3.700 maglie: prime divisioni di tutto
il mondo, molte seconde e terze categorie, Champions League, Europa League e tutte le
nazionali. Si sceglie la squadra e maglia e stemma vengono abbinati da soli, senza Internet.
Le maglie provengono da footballkitarchive.com, usate con autorizzazione e citate nei crediti.

Novità della 5.5: tre formule di gioco che mancavano. La coppa andata e ritorno,
dove ogni turno si gioca in due gare e conta la somma delle reti, col campo invertito
al ritorno e la finale in gara secca. Il sistema McMahon, uno svizzero che non parte
da zero: i partecipanti si dividono in fasce di forza e chi è più forte comincia
avanti, così dal primo turno i migliori si incontrano fra loro invece di eliminarsi
per sorteggio. Il ripescaggio olimpico, la formula del judo: chi è stato battuto da un
finalista rientra in gara e si assegnano due bronzi, perché nessuno esca dal torneo
per un abbinamento sfortunato.

Si può finalmente ANNULLARE un risultato: la gara torna fra quelle da giocare, con
tabellino e cartellini azzerati, e può essere rigiocata o riassegnata a un campo.
Prima di procedere il programma dichiara che cosa si perde, e nei tabelloni quante
partite già giocate verranno azzerate perché chi era passato torna indietro. Di ogni
annullamento resta traccia in un registro.

Corretto un difetto grave: le fotografie inviate dagli arbitri col telefono non
arrivavano MAI alla Regia, con o senza tunnel. Il server sbagliava a leggere
l'immagine e chiudeva la richiesta senza rispondere, così il telefono restava in
attesa e annunciava «nessun collegamento», mandando a cercare il guasto dalla parte
sbagliata. Ora arrivano, e quando qualcosa non va il messaggio dice davvero che cosa
è successo.

Il catalogo degli stemmi è stato ripulito: 61 voci erano loghi di campionato finiti
per errore fra le squadre — «Major League Soccer» compariva nove volte come se fosse
un club — e le squadre presenti sotto due nomi diversi sono state unificate.

Novità della 5.4: la licenza non si perde più quando cambia lo schermo — bastava
collegare il proiettore perché il programma la richiedesse come se fosse un altro
computer. Gironi e classifiche passano ai caratteri da tabellone, grandi e leggibili
dal fondo della sala. Nuova opzione per non anticipare gare del turno successivo pur
di riempire i campi, così le giornate restano allineate. Nella Presentazione si vedono
quattro risultati per volta, a rotazione e con le gare in corso davanti, e in basso
scorrono le foto scattate prima del via. A fine tempo la cornice del campo pulsa, per
non lasciare un tavolo fermo senza accorgersene. In Live, la clip che arriva da un
campo si guarda subito in un riquadro che si chiude da solo. Il libro dei ricordi
contiene ora TUTTE le partite giocate con risultato e tabellino, non più le sole gare
fotografate. Corretto un difetto per cui le classifiche stampate uscivano di pochi
millimetri dal foglio A4.

Novità della 5.3: le riprese dell'App Replay non sono più GIF animate a 256
pixel ma video MP4 a 1280x720 — cinque volte i pixel e, a parità di secondi, un
file più leggero di prima. Il montaggio di fine partita rimette in fila le azioni
senza ricomprimerle, quindi non perde un fotogramma. «La Legge» accoglie il
quarto regolamento, le regole avanzate WASPA, in italiano e in inglese: 132
passaggi consultabili come gli altri. E i dodici tasti funzione della tastiera
saltano da una sezione all'altra senza cercare il menu: F1 mostra l'elenco.

Novità della 5.2: il tunnel Internet è diventato un interruttore. cloudflared — il
componente gratuito di Cloudflare che apre il collegamento — ora viaggia dentro il
programma: non c'è più niente da scaricare né da installare a mano, si accende
l'interruttore nella sezione Regia e in una decina di secondi compare l'indirizzo
https pubblico. È la strada più rapida per far funzionare i telefoni fuori dalla sala
e per accendere la telecamera dell'App Replay, che senza https non parte.

Novità della 5.1: la sezione «Regia Audio» diventa «Regia» e raccoglie anche tutto
il collegamento con i telefoni (chiave, QR, dispositivi, tunnel e grafica per la
diretta), prima sparso nelle Opzioni. Accanto all'orologio compare una spia che dice
se il tunnel Cloudflare è acceso — è la condizione perché l'App Replay possa accendere
la telecamera. Nella Presentazione, sotto ai risultati, scorre una striscia con le foto
della giornata in corso, ognuna con squadre, risultato e momento dello scatto. Corretto
un errore che impediva alle app mobili di collegarsi passando dalla Wi-Fi al tunnel:
l'indirizzo memorizzato vinceva su quello da cui la pagina veniva servita e il browser
bloccava la chiamata come contenuto misto.

Novità della 5.0: la nuova App Replay. Un telefono punta il tavolo e riprende senza
sosta, ma tiene in memoria solo gli ultimi otto secondi: quando succede qualcosa basta
premere il tasto rosso e quegli otto secondi appena visti diventano una GIF animata,
che arriva alla Regia abbinata alla partita. A fine gara il computer monta da solo tutte
le azioni in un unico filmato. Nel libro dei ricordi arrivano i tabellini delle marcature,
le pagine decorate e l'impaginazione a quattro partite per foglio, foto comprese; dalle
foto d'archivio si può cancellare il singolo scatto; nella Regia Audio i filtri anti-rumore
del browser si possono spegnere, così la voce e il vociare della sala passano intatti.

Novità della 4.0: gli arbitri fotografano i due sfidanti dal telefono e le immagini
arrivano alla Regia abbinate alla loro partita; a fine giornata ne esce un libro dei
ricordi in PDF. Le foto finiscono anche nell'archivio storico: la faccia del campione
nell'albo d'oro e gli scatti di ogni giocatore nella sua scheda.

Novità della 3.3: l'archivio storico con albo d'oro, classifica perpetua, schede dei
giocatori e testa a testa; la grafica trasparente per la diretta in OBS; la stima della
durata che si aggiorna durante la giornata; il ritiro di un partecipante, i segnaposto
da tavolo, le classifiche leggibili anche a chi non distingue verde e rosso, il backup
automatico su disco.

Novità della 3.2.1: risolto il collegamento dei telefoni. Su Windows il codice QR
poteva indicare una scheda di rete virtuale (Hyper-V, WSL, VirtualBox) e il telefono
non riusciva ad aprire la pagina: ora gli indirizzi sono ordinati per probabilità e
se ne può scegliere uno a mano.

Novità della 3.2: la pagina del vincitore a schermo intero, con stemma, nomi in oro,
fuochi d'artificio e inno del campione. Il catalogo delle miniature HW è sospeso.

Novità della 3.1: la libreria musicale è ora fatta di 45 brani originali composti
dall'autore e compresi nella licenza d'uso.

Novità della 3.0: licenza per dispositivo, versione dimostrativa, stima della durata
del torneo, manuale rivisto (83 pagine)."
fi

echo "▸ Carico gli installer (circa 1,9 GB, ci vorrà un po')…"
gh release upload "$TAG" --repo "$UTENTE/$REPO" --clobber \
  dist/Subbuteo-Tournament-Center-6.0.0-macOS-AppleSilicon.dmg \
  dist/Subbuteo-Tournament-Center-6.0.0-macOS-Intel.dmg \
  dist/Subbuteo-Tournament-Center-Setup-6.0.0-Windows.exe \
  dist/Subbuteo-Tournament-Center-6.0.0-Linux-x86_64.AppImage \
  dist/Subbuteo-Tournament-Center-6.0.0-Linux-arm64.AppImage \
  dist/Manuale-Subbuteo-Tournament-Center-6.0.pdf

echo
echo "✔ Fatto."
echo "  Sito:     https://$(echo $UTENTE | tr '[:upper:]' '[:lower:]').github.io/$REPO/"
echo "  Release:  https://github.com/$UTENTE/$REPO/releases/tag/$TAG"
echo
echo "  Le pagine possono impiegare un paio di minuti prima di comparire."
