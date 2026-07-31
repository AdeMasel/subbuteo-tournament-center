#!/bin/bash
# Carica gli allegati della release uno alla volta, con ritentativi: durante
# l'upload la linea è satura e le chiamate all'API di GitHub falliscono spesso.
REPO="AdeMasel/subbuteo-tournament-center"
TAG="v5.1.0"
cd "$(dirname "$0")"
elenco(){ gh api "repos/$REPO/releases/tags/$TAG" --jq ".assets[]|select(.name==\"$1\")|.size" 2>/dev/null | head -1; }
for f in dist/*; do
  n="$(basename "$f")"; att=$(stat -f%z "$f")
  if [ "$(elenco "$n")" = "$att" ]; then echo "= già presente: $n ($att byte)"; continue; fi
  ok=0
  for try in 1 2 3 4 5; do
    echo "▸ carico $n (tentativo $try)…"
    gh release upload "$TAG" --repo "$REPO" --clobber "$f" 2>&1 | tail -2
    sleep 5
    if [ "$(elenco "$n")" = "$att" ]; then echo "✓ $n ($att byte)"; ok=1; break; fi
    echo "  non confermato, riprovo fra 20s"; sleep 20
  done
  [ "$ok" = 1 ] || echo "✗ FALLITO: $n"
done
echo "=== FINE ==="
gh api "repos/$REPO/releases/tags/$TAG" --jq '.assets[]|"\(.name) \(.size)"'
