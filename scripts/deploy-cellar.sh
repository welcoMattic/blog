#!/usr/bin/env bash
# Build le site et le synchronise vers le bucket Cellar (Clever Cloud).
#
# Identifiants attendus dans l'environnement (depuis l'add-on Cellar) :
#   AWS_ACCESS_KEY_ID      = CELLAR_ADDON_KEY_ID
#   AWS_SECRET_ACCESS_KEY  = CELLAR_ADDON_KEY_SECRET
# En local : `eval "$(clever addon env addon_d397a3c9-5e34-4b2f-8938-3c5f84a39847 \
#   | sed -E 's/^CELLAR_ADDON_KEY_ID/AWS_ACCESS_KEY_ID/;s/^CELLAR_ADDON_KEY_SECRET/AWS_SECRET_ACCESS_KEY/')"`
# puis `npm run deploy`.
#
# Utilise le CLI `aws` s'il est présent, sinon le conteneur Docker amazon/aws-cli.
set -euo pipefail

BUCKET="${CELLAR_BUCKET:-blog.welcomattic.com}"
ENDPOINT="${CELLAR_ENDPOINT:-https://cellar-c2.services.clever-cloud.com}"

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
# aws-cli v2 envoie des checksums d'integrite que Cellar (Ceph RadosGW) rejette.
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required

: "${AWS_ACCESS_KEY_ID:?definis AWS_ACCESS_KEY_ID (CELLAR_ADDON_KEY_ID)}"
: "${AWS_SECRET_ACCESS_KEY:?definis AWS_SECRET_ACCESS_KEY (CELLAR_ADDON_KEY_SECRET)}"

echo "==> Build"
npx astro build

DIST="dist"
if command -v aws >/dev/null 2>&1; then
  awscli() { aws "$@"; }
else
  echo "==> aws CLI absent : conteneur Docker amazon/aws-cli"
  DIST="/dist"
  awscli() {
    docker run --rm \
      -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
      -e AWS_REQUEST_CHECKSUM_CALCULATION -e AWS_RESPONSE_CHECKSUM_VALIDATION \
      -v "$PWD/dist:/dist" amazon/aws-cli "$@"
  }
fi

echo "==> Sync HTML/XML/assets non fingerprintes (cache court)"
awscli s3 sync "$DIST" "s3://$BUCKET" \
  --endpoint-url "$ENDPOINT" \
  --delete --exclude "_astro/*" \
  --cache-control "public, max-age=0, must-revalidate"

echo "==> Sync assets fingerprintes _astro/ (cache immutable 1 an)"
awscli s3 sync "$DIST/_astro" "s3://$BUCKET/_astro" \
  --endpoint-url "$ENDPOINT" \
  --cache-control "public, max-age=31536000, immutable"

echo "==> Termine. https://$BUCKET/"
