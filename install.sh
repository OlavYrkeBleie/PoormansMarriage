#!/usr/bin/env bash
# Poorman's Marriage installer for Linux / macOS.
#
# Clones or updates the repo into ./PoormansMarriage, installs dependencies,
# generates a random JWT secret, runs migrations and seeds default categories,
# then prints the URL to open.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/OlavYrkeBleie/PoormansMarriage/main/install.sh | bash
# or:
#   bash install.sh
#
# Requires: node 20+, npm 10+, git.

set -euo pipefail

REPO_URL="https://github.com/OlavYrkeBleie/PoormansMarriage.git"
DIR="PoormansMarriage"

say() { printf "\n== %s ==\n" "$1"; }
die() { printf "\nERROR: %s\n" "$1" >&2; exit 1; }

say "Checking prerequisites"
command -v git >/dev/null  || die "git is required."
command -v node >/dev/null || die "node 20+ is required. Install from https://nodejs.org/"
command -v npm >/dev/null  || die "npm is required (comes with node)."

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then die "Node $NODE_MAJOR is too old. Upgrade to 20 or newer."; fi

if [ -d "$DIR/.git" ]; then
  say "Repo already exists, pulling latest"
  (cd "$DIR" && git pull --ff-only)
else
  say "Cloning into $DIR"
  git clone "$REPO_URL" "$DIR"
fi

cd "$DIR"

if [ ! -f .env ]; then
  say "Creating .env with a random JWT secret"
  cp .env.example .env
  if command -v openssl >/dev/null; then
    SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
  else
    SECRET=$(node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))")
  fi
  # Portable sed replacement (macOS and GNU)
  case "$(uname -s)" in
    Darwin) sed -i '' -e "s|^JWT_SECRET=.*|JWT_SECRET=$SECRET|" .env ;;
    *)      sed -i -e "s|^JWT_SECRET=.*|JWT_SECRET=$SECRET|" .env ;;
  esac
else
  say ".env already exists, leaving it alone"
fi

say "Installing dependencies (this can take a few minutes)"
npm install

say "Running database migrations + seeding default categories"
npm run db:seed

PORT=$(grep -E "^PORT=" .env | cut -d= -f2 | tr -d '[:space:]')
PORT=${PORT:-3100}

cat <<EOF

Poorman's Marriage is installed.

Start it:
    cd $DIR
    npm run dev

Then open http://localhost:5173 and register two users.

The app stores everything in $DIR/data/. Back that folder up to keep your data.

EOF
