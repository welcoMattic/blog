#!/usr/bin/env bash
# Vérifie que le site en ligne correspond au build qui vient d'être déployé.
#
# Trois contrôles, du plus large au plus précis :
#   1. le sitemap en ligne porte autant d'URL que celui de `dist/` : un sync
#      tronqué, ou un déploiement qui n'a pas eu lieu, se voit ici ;
#   2. chaque article daté d'aujourd'hui a bien une page dans `dist/` : si ce
#      n'est pas le cas, c'est le filtre de publication qui n'a pas vu la date
#      arriver, pas le déploiement ;
#   3. la même page répond 200 sur le domaine : c'est ce que le passage du matin
#      est censé mettre en ligne, et c'est ce qui manquait le 29/09/2026.
#
# Le jour est calculé en Europe/Paris et comparé aux 10 premiers caractères de
# la date du front matter, exactement comme `isPublished()` de src/lib/publish.ts.
#
# S'exécute aussi en local après un `npm run deploy`, ou seul pour auditer la
# production : `bash scripts/verify-deploy.sh`.
set -euo pipefail

BASE_URL="${BASE_URL:-https://blog.welcomattic.com}"
DIST="${DIST:-dist}"
CONTENT="${CONTENT:-content/blog}"

fail() { echo "ERREUR : $*" >&2; exit 1; }

# Un 403 de Cellar sur un objet absent n'est pas une erreur transitoire, donc
# `--retry` ne couvre que le réseau et les 5xx : c'est exactement ce qu'on veut.
http_code() {
  curl -s -o /dev/null -w '%{http_code}' --retry 3 --retry-delay 5 --max-time 30 "$1"
}

[ -f "$DIST/sitemap.xml" ] || fail "$DIST/sitemap.xml absent : le build n'a pas eu lieu"

echo "==> Sitemap"
built=$(grep -o '<loc>' "$DIST/sitemap.xml" | wc -l | tr -d ' ')
live=$(curl -fsS --retry 3 --retry-delay 5 --max-time 30 "$BASE_URL/sitemap.xml" \
  | grep -o '<loc>' | wc -l | tr -d ' ')
echo "    $built URL construites, $live en ligne"
[ "$built" -gt 0 ] || fail "le sitemap construit est vide"
if [ "$live" -lt "$built" ]; then
  fail "le sitemap en ligne porte $live URL au lieu de $built : déploiement incomplet"
elif [ "$live" -gt "$built" ]; then
  # En CI le build est toujours frais, donc ce cas ne s'y produit pas. En local,
  # il dit simplement que `dist/` date d'avant le dernier déploiement.
  fail "le sitemap en ligne porte $live URL pour $built construites : $DIST est plus ancien que la production, relance le build"
fi

echo "==> Articles datés d'aujourd'hui"
today=$(TZ=Europe/Paris date +%F)
due=0
for file in "$CONTENT"/*.md; do
  date_value=$(sed -n 's/^date:[[:space:]]*//p' "$file" | head -1 | tr -d "\"'")
  [ "${date_value:0:10}" = "$today" ] || continue

  due=$((due + 1))
  slug=$(basename "$file" .md)

  # L'URL vient du nom de fichier (route src/pages/blog/[...slug].astro). Le
  # contrôle sur `dist/` garde ce script honnête : si la convention de slug
  # changeait, il échouerait ici plutôt que d'interroger une URL inventée.
  [ -f "$DIST/blog/$slug/index.html" ] \
    || fail "$DIST/blog/$slug/index.html absent alors que l'article est daté du $today"

  url="$BASE_URL/blog/$slug/"
  code=$(http_code "$url")
  echo "    $url -> $code"
  [ "$code" = "200" ] || fail "$url répond $code : l'article du jour n'est pas en ligne"
done

if [ "$due" -eq 0 ]; then
  echo "    aucun article daté du $today"
else
  echo "    $due article(s) daté(s) du $today, tous en ligne"
fi

echo "==> Site conforme au build"
