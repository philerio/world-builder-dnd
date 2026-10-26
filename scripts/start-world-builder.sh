#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v npm >/dev/null 2>&1; then
  if [[ -f /home/patrick/.config/nvm/nvm.sh ]]; then
    # Make the installed Node 24 runtime available in non-login terminals too.
    # shellcheck source=/dev/null
    source /home/patrick/.config/nvm/nvm.sh
    nvm use 24
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Install Node 24 or configure nvm, then try again." >&2
  exit 1
fi

if [[ ! -x .venv/bin/uvicorn ]]; then
  echo "The project API environment is missing: .venv/bin/uvicorn" >&2
  exit 1
fi

api_pid=""
frontend_pid=""

cleanup() {
  if [[ -n "$frontend_pid" ]]; then kill "$frontend_pid" 2>/dev/null || true; fi
  if [[ -n "$api_pid" ]]; then kill "$api_pid" 2>/dev/null || true; fi
  if [[ -n "$frontend_pid" ]]; then wait "$frontend_pid" 2>/dev/null || true; fi
  if [[ -n "$api_pid" ]]; then wait "$api_pid" 2>/dev/null || true; fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

./.venv/bin/uvicorn worldbuilder.api.app:app --host 127.0.0.1 --port 8000 &
api_pid=$!
npm --prefix frontend run dev:lan -- --strictPort &
frontend_pid=$!

printf '\nWorld Builder is starting.\n'
printf 'On this computer: http://localhost:5173\n'
printf 'On your phone: open Phone access in the app to see the Wi-Fi address.\n'
printf 'Stop both servers with Ctrl+C.\n\n'

wait -n "$api_pid" "$frontend_pid"
