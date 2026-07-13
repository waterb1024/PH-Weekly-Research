#!/bin/bash
#
# Weekly research runner for local execution.
# Uses the `claude` CLI (Claude Code) with an existing subscription auth,
# so no API credits are consumed.
#
# Usage:
#   scripts/local-runner.sh <source>
#
# <source>: product_hunt | indie_hackers | hacker_news | reddit

set -euo pipefail

SOURCE="${1:-}"
if [ -z "$SOURCE" ]; then
  echo "usage: $0 <source>" >&2
  exit 2
fi

case "$SOURCE" in
  product_hunt|indie_hackers|hacker_news|reddit) ;;
  *) echo "unknown source: $SOURCE" >&2; exit 2 ;;
esac

REPO_DIR="$( cd "$(dirname "$0")/.." && pwd -P )"
PROMPT_NAME="${SOURCE//_/-}-research-prompt.md"
PROMPT_FILE="$REPO_DIR/scripts/prompts/$PROMPT_NAME"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "prompt not found: $PROMPT_FILE" >&2
  exit 1
fi

# Load .env (INGEST_API_KEY, optionally TURSO_URL/TOKEN if needed elsewhere)
if [ -f "$REPO_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_DIR/.env"
  set +a
fi

if [ -z "${INGEST_API_KEY:-}" ]; then
  echo "INGEST_API_KEY not set (expected in $REPO_DIR/.env)" >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "claude CLI not found in PATH. Install Claude Code or update PATH." >&2
  exit 1
fi

TMPDIR_L="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_L"' EXIT

RESPONSE_FILE="$TMPDIR_L/response.txt"
REPORT_FILE="$TMPDIR_L/report.json"

echo "[$(date '+%F %T')] $SOURCE: running claude..."
claude -p --dangerously-skip-permissions "$(cat "$PROMPT_FILE")" > "$RESPONSE_FILE"
echo "[$(date '+%F %T')] $SOURCE: response bytes: $(wc -c < "$RESPONSE_FILE")"

python3 - "$RESPONSE_FILE" "$SOURCE" "$REPORT_FILE" <<'PYEOF'
import json, re, sys, pathlib

resp, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
text = pathlib.Path(resp).read_text(encoding="utf-8")

# Prefer fenced ```json blocks; fall back to brute-force balance scan.
fenced = re.findall(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
cands = list(fenced)
if not cands:
    s = text.find("{")
    while s != -1:
        depth = 0
        for i in range(s, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    cands.append(text[s:i + 1])
                    break
        s = text.find("{", s + 1)

cands.sort(key=len, reverse=True)
for raw in cands:
    try:
        d = json.loads(raw)
        if isinstance(d, dict) and "top5Opportunities" in d:
            d["source"] = src
            pathlib.Path(out).write_text(json.dumps(d, ensure_ascii=False))
            print(f"parsed: themes={len(d.get('themes', []))} opps={len(d.get('top5Opportunities', []))}")
            sys.exit(0)
    except Exception:
        continue
sys.exit("no parseable JSON found in response")
PYEOF

echo "[$(date '+%F %T')] $SOURCE: POSTing to Render..."
curl -sSf -X POST https://notepad-dvf7.onrender.com/api/reports/ingest \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d "@$REPORT_FILE"
echo
echo "[$(date '+%F %T')] $SOURCE: done"
