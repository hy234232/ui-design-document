#!/bin/bash
# 기능 명세 생성기 — 백그라운드 서버 설치
# 실행: bash install.sh

set -e

PLIST_NAME="com.figma.feature-spec.server"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
SERVER_PATH="$HOME/Documents/figmaplugin_260531/server.js"
LOG_DIR="$HOME/Documents/figmaplugin_260531/logs"

# node 경로 확인
NODE_PATH=$(which node 2>/dev/null || true)
if [ -z "$NODE_PATH" ]; then
  echo "❌ Node.js가 설치되어 있지 않습니다."
  echo "   https://nodejs.org 에서 설치 후 다시 실행해주세요."
  exit 1
fi

# Claude Code CLI 확인
CLAUDE_PATH="$HOME/Library/Application Support/Claude/claude-code/2.1.149/claude.app/Contents/MacOS/claude"
if [ ! -x "$CLAUDE_PATH" ]; then
  CLAUDE_PATH=$(which claude 2>/dev/null || true)
fi
if [ -z "$CLAUDE_PATH" ]; then
  echo "❌ Claude Code CLI를 찾을 수 없습니다."
  echo "   Claude Desktop 앱이 설치되어 있는지 확인해주세요."
  exit 1
fi
echo "✔ Claude CLI: $CLAUDE_PATH"

mkdir -p "$LOG_DIR"

# 기존 서비스 중지
if launchctl list 2>/dev/null | grep -q "$PLIST_NAME"; then
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
fi

# PATH 구성 (node, claude 경로 포함)
LAUNCH_PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$(dirname "$NODE_PATH"):$(dirname "$CLAUDE_PATH")"

# plist 생성 (HOME, PATH 명시 — launchd는 shell 환경을 상속하지 않음)
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_NAME</string>

  <key>ProgramArguments</key>
  <array>
    <string>$NODE_PATH</string>
    <string>$SERVER_PATH</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>$HOME</string>
    <key>USER</key>
    <string>$USER</string>
    <key>PATH</key>
    <string>$LAUNCH_PATH</string>
  </dict>

  <key>WorkingDirectory</key>
  <string>$HOME/Documents/figmaplugin_260531</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>$LOG_DIR/server.log</string>

  <key>StandardErrorPath</key>
  <string>$LOG_DIR/server.error.log</string>
</dict>
</plist>
EOF

launchctl load "$PLIST_PATH"

echo ""
echo "✅ 설치 완료!"
echo "   서버가 백그라운드에서 실행 중입니다. (포트 3765)"
echo "   Claude Code 로그인 세션을 사용합니다. (API 키 불필요)"
echo "   Mac 재시작 후에도 자동으로 실행됩니다."
echo ""
echo "   로그 확인:  tail -f $LOG_DIR/server.log"
echo "   서비스 중지: bash $HOME/Documents/figmaplugin_260531/uninstall.sh"
