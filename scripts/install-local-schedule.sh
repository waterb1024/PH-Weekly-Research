#!/bin/bash
#
# Install/reinstall the local launchd schedule for Prism weekly research.
# Creates 4 plists in ~/Library/LaunchAgents/ pointing to scripts/local-runner.sh,
# then loads them. Idempotent — safe to run repeatedly.
#
# Schedule (KST, no DST):
#   Monday    09:00  product_hunt
#   Tuesday   09:00  indie_hackers
#   Wednesday 09:00  hacker_news
#   Thursday  09:00  reddit
#
# launchd honors StartCalendarInterval in the system's local time. Ensure your
# Mac's timezone is Asia/Seoul or adjust the Hour field below.
#
# Usage:
#   scripts/install-local-schedule.sh          # install/reload all
#   scripts/install-local-schedule.sh unload   # unload all (stop scheduling)

set -euo pipefail

REPO_DIR="$( cd "$(dirname "$0")/.." && pwd -P )"
RUNNER="$REPO_DIR/scripts/local-runner.sh"
LOG_DIR="$HOME/Library/Logs/prism"
AGENT_DIR="$HOME/Library/LaunchAgents"

# Detect claude CLI location and prepend its dir to PATH so launchd finds it.
CLAUDE_BIN="$(command -v claude || true)"
if [ -z "$CLAUDE_BIN" ]; then
  echo "claude CLI not found in current PATH. Install Claude Code first." >&2
  exit 1
fi
CLAUDE_DIR="$(dirname "$CLAUDE_BIN")"
PATH_STR="$CLAUDE_DIR:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

mkdir -p "$LOG_DIR" "$AGENT_DIR"

# label suffix, source, weekday (1=Mon .. 7=Sun for launchd; Sun can be 0 or 7)
JOBS=(
  "product_hunt:product_hunt:1"
  "indie_hackers:indie_hackers:2"
  "hacker_news:hacker_news:3"
  "reddit:reddit:4"
)

CMD="${1:-install}"

for job in "${JOBS[@]}"; do
  IFS=":" read -r suffix source weekday <<<"$job"
  label="com.prism.research.$suffix"
  plist="$AGENT_DIR/$label.plist"

  # Unload if already loaded (ignore errors — may not be loaded yet)
  launchctl unload "$plist" 2>/dev/null || true

  if [ "$CMD" = "unload" ]; then
    rm -f "$plist"
    echo "unloaded + removed $label"
    continue
  fi

  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$label</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-lc</string>
        <string>$RUNNER $source</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>$weekday</integer>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/$source.out.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/$source.err.log</string>
    <key>WorkingDirectory</key>
    <string>$REPO_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$PATH_STR</string>
    </dict>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

  launchctl load "$plist"
  echo "installed $label -> weekday=$weekday 09:00 KST, source=$source"
done

if [ "$CMD" = "unload" ]; then
  echo "all schedules unloaded"
else
  echo
  echo "logs: $LOG_DIR/*.log"
  echo "manual test: $RUNNER product_hunt"
  echo "list:        launchctl list | grep com.prism.research"
fi
