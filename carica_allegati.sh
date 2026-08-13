#!/bin/bash
# Carica sulla release gli allegati che ancora mancano, UNO ALLA VOLTA e con
# ritentativi. La rete di questa macchina, sotto un caricamento continuo da
# quasi due giga, ogni tanto smette di risolvere i nomi ("no such host",
# "can't assign requested address"): un solo `gh release upload` con sei file
# perde tutto al primo intoppo, mentre così ciò che è passato resta.
set -uo pipefail
export PATH="$PATH:$HOME/.local/bin"
cd "$(dirname "$0")"

TAG="v6.1.1"
REPO="AdeMasel/subbuteo-tournament-center"
FILE=(
  "Manuale-Subbuteo-Tournament-Center-6.1.pdf"
  "Subbuteo-Tournament-Center-6.1.1-macOS-AppleSilicon.dmg"
  "Subbuteo-Tournament-Center-6.1.1-macOS-Intel.dmg"
  "Subbuteo-Tournament-Center-Setup-6.1.1-Windows.exe"
  "Subbuteo-Tournament-Center-6.1.1-Linux-x86_64.AppImage"
  "Subbuteo-Tournament-Center-6.1.1-Linux-arm64.AppImage"
)

# dimensione dell'allegato già presente sulla release (vuoto se non c'è)
remoto() {
  gh release view "$TAG" --repo "$REPO" --json assets \
     -q ".assets[]|select(.name==\"$1\")|.size" 2>/dev/null
}

for f in "${FILE[@]}"; do
  locale=$(stat -f%z "dist/$f" 2>/dev/null || echo 0)
  [ "$locale" -gt 0 ] || { echo "!! manca dist/$f"; continue; }

  for t in 1 2 3 4 5 6 7 8; do
    r=$(remoto "$f")
    if [ "$r" = "$locale" ]; then echo "OK   $f ($((locale/1048576)) MB)"; break; fi
    [ -n "$r" ] && echo "     $f: caricamento parziale sul server, lo rifaccio"
    echo "···  $f — tentativo $t"
    if gh release upload "$TAG" --repo "$REPO" --clobber "dist/$f" 2>&1 | tail -2; then
      sleep 4
      [ "$(remoto "$f")" = "$locale" ] && { echo "OK   $f ($((locale/1048576)) MB)"; break; }
    fi
    sleep $((t * 20))
  done
  [ "$(remoto "$f")" = "$locale" ] || echo "KO   $f — non caricato"
done

echo
echo "FATTO: $(gh release view "$TAG" --repo "$REPO" --json assets -q '.assets|length')/6 allegati"
