#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
port="${PORT:-8000}"
printf 'http://127.0.0.1:%s/solver/\n' "$port"
exec python3 -m http.server "$port" --bind 127.0.0.1
