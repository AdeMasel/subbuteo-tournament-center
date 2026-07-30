#!/bin/bash
# Pubblica il sito su GitHub Pages e gli installer su GitHub Releases.
# Richiede: gh già autenticato (gh auth status).
set -euo pipefail

UTENTE="AdeMasel"
REPO="subbuteo-tournament-center"
TAG="v4.0.0"
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
git commit -q -m "Sito di presentazione di Subbuteo Tournament Center 3.0" || echo "▸ Niente da committare."
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
    --title "Subbuteo Tournament Center 4.0" \
    --notes "Versione dimostrativa per macOS, Windows e Linux.

Il programma si installa in versione DIMOSTRATIVA: torneo a girone unico, tabelloni
dal vivo, classifiche, Presentazione e stima della durata. Per sbloccare tutte le
funzioni serve un codice di attivazione valido per il singolo dispositivo — le
istruzioni sono su https://$(echo $UTENTE | tr '[:upper:]' '[:lower:]').github.io/$REPO/#licenza

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
  dist/Subbuteo-Tournament-Center-4.0.0-macOS-AppleSilicon.dmg \
  dist/Subbuteo-Tournament-Center-4.0.0-macOS-Intel.dmg \
  dist/Subbuteo-Tournament-Center-Setup-4.0.0-Windows.exe \
  dist/Subbuteo-Tournament-Center-4.0.0-Linux-x86_64.AppImage \
  dist/Subbuteo-Tournament-Center-4.0.0-Linux-arm64.AppImage \
  dist/Manuale-Subbuteo-Tournament-Center-4.0.0.pdf

echo
echo "✔ Fatto."
echo "  Sito:     https://$(echo $UTENTE | tr '[:upper:]' '[:lower:]').github.io/$REPO/"
echo "  Release:  https://github.com/$UTENTE/$REPO/releases/tag/$TAG"
echo
echo "  Le pagine possono impiegare un paio di minuti prima di comparire."
