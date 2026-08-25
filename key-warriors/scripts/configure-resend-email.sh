#!/usr/bin/env bash
# Configure Neon Auth to send emails via Resend SMTP (not Neon's shared mail).
# Usage: source apps/web/.env.local && ./scripts/configure-resend-email.sh

set -euo pipefail

: "${RESEND_API_KEY:?Set RESEND_API_KEY in apps/web/.env.local}"
: "${EMAIL_FROM:?Set EMAIL_FROM in apps/web/.env.local}"

PROJECT_ID="${NEON_PROJECT_ID:-damp-sound-81133860}"
BRANCH_ID="${NEON_BRANCH_ID:-br-super-wave-azeuafzi}"
SENDER_NAME="${EMAIL_SENDER_NAME:-Keyboard Warriors}"

echo "Updating Neon Auth email provider for project ${PROJECT_ID}..."

neonctl neon-auth config email-provider update \
  --project-id "$PROJECT_ID" \
  --branch "$BRANCH_ID" \
  --type standard \
  --host smtp.resend.com \
  --port 465 \
  --username resend \
  --password "$RESEND_API_KEY" \
  --sender-email "$EMAIL_FROM" \
  --sender-name "$SENDER_NAME" \
  -o json

echo ""
echo "Done. Test with:"
echo "  neonctl neon-auth config email-provider test \\"
echo "    --project-id $PROJECT_ID --branch $BRANCH_ID \\"
echo "    --host smtp.resend.com --port 465 --username resend \\"
echo "    --password \"\$RESEND_API_KEY\" --sender-email \"\$EMAIL_FROM\" \\"
echo "    --sender-name \"$SENDER_NAME\" --recipient-email your@email.com"
