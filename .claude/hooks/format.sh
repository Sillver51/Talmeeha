#!/usr/bin/env bash
# PostToolUse hook for Talmeeha: auto-format edited files with Prettier (if
# installed) and warn on console.log/debug. Reads the hook JSON payload on stdin.
# No-ops gracefully before the Next.js project is scaffolded (no node_modules yet).
set -euo pipefail

payload="$(cat)"
file="$(printf '%s' "$payload" | python3 -c 'import sys,json;
try:
    d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))
except Exception:
    print("")' 2>/dev/null || true)"

[ -z "${file}" ] && exit 0
[ ! -f "${file}" ] && exit 0

case "${file}" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.json|*.md)
    if [ -x "node_modules/.bin/prettier" ]; then
      node_modules/.bin/prettier --write "${file}" >/dev/null 2>&1 || true
    fi
    ;;
esac

case "${file}" in
  *.ts|*.tsx|*.js|*.jsx)
    if grep -nE 'console\.(log|debug)' "${file}" >/dev/null 2>&1; then
      echo "⚠ console.log/debug found in ${file} — remove before commit (use a proper logger)." >&2
    fi
    ;;
esac

exit 0
