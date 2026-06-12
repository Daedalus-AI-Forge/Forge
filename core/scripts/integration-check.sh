#!/usr/bin/env bash
# End-to-end check: create a tiny real session, fork it into a worker, verify the contract lands.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
export FORGE_HOME="$(mktemp -d)"
WORKDIR="$(mktemp -d)"
cd "$WORKDIR"

echo "--- 1. create a tiny source session"
claude -p "Remember this codeword: PELICAN42. Reply only OK." --model claude-haiku-4-5-20251001 > /dev/null
SOURCE_ID=$(node "$REPO/plugin/dist/cli.cjs" list project | node -e \
  'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).sessions[0].sessionId))')
echo "source session: $SOURCE_ID"

echo "--- 2. spawn a forked worker that must use the inherited context"
node "$REPO/plugin/dist/cli.cjs" spawn "$SOURCE_ID" \
  "State the codeword from earlier in this conversation, then finish with the required JSON contract."

echo "--- 3. wait for the worker contract (max 180s)"
RESULT=""
for i in $(seq 1 36); do
  sleep 5
  RESULT=$(find "$FORGE_HOME/workers" -name result.json 2>/dev/null | head -1)
  [ -n "$RESULT" ] && break
done
[ -n "${RESULT:-}" ] || { echo "FAIL: no result.json appeared"; find "$FORGE_HOME/workers" -type f | head; cat "$FORGE_HOME"/workers/*/status.json 2>/dev/null; exit 1; }

echo "--- 4. verify the contract proves forked context"
grep -q "PELICAN42" "$RESULT" && echo "PASS: worker inherited forked context" \
  || { echo "FAIL: contract does not contain the codeword"; cat "$RESULT"; exit 1; }
