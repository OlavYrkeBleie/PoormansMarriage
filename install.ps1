# Poorman's Marriage installer for Windows (PowerShell).
#
# Clones or updates the repo, installs dependencies, generates a random
# JWT secret, runs migrations and seeds default categories.
#
# Usage:
#   iwr -useb https://raw.githubusercontent.com/OlavYrkeBleie/PoormansMarriage/main/install.ps1 | iex
# or:
#   powershell -ExecutionPolicy Bypass -File install.ps1
#
# Requires: Node.js 20+ (https://nodejs.org/), git (https://git-scm.com/).

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/OlavYrkeBleie/PoormansMarriage.git"
$Dir     = "PoormansMarriage"

function Say($msg) { Write-Host ""; Write-Host "== $msg ==" -ForegroundColor Cyan }
function Die($msg) { Write-Host ""; Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

Say "Checking prerequisites"
foreach ($cmd in @("git", "node", "npm")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Die "$cmd is required." }
}

$NodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($NodeMajor -lt 20) { Die "Node $NodeMajor is too old. Upgrade to 20+ from https://nodejs.org/" }

if (Test-Path "$Dir/.git") {
  Say "Repo already exists, pulling latest"
  Push-Location $Dir
  git pull --ff-only
  Pop-Location
} else {
  Say "Cloning into $Dir"
  git clone $RepoUrl $Dir
}

Set-Location $Dir

if (-not (Test-Path ".env")) {
  Say "Creating .env with a random JWT secret"
  Copy-Item ".env.example" ".env"
  $Secret = (node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))").Trim()
  (Get-Content .env) -replace '^JWT_SECRET=.*', "JWT_SECRET=$Secret" | Set-Content .env
} else {
  Say ".env already exists, leaving it alone"
}

Say "Installing dependencies (this can take a few minutes)"
npm install

Say "Running database migrations + seeding default categories"
npm run db:seed

Write-Host ""
Write-Host "Poorman's Marriage is installed." -ForegroundColor Green
Write-Host ""
Write-Host "Start it:"
Write-Host "    cd $Dir"
Write-Host "    npm run dev"
Write-Host ""
Write-Host "Then open http://localhost:5173 and register two users."
Write-Host ""
Write-Host "The app stores everything in $Dir\data\. Back that folder up to keep your data."
Write-Host ""
