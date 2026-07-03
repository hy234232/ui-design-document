#!/bin/bash
# 백그라운드 서버 제거

PLIST_NAME="com.figma.feature-spec.server"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

if launchctl list | grep -q "$PLIST_NAME" 2>/dev/null; then
  launchctl unload "$PLIST_PATH" 2>/dev/null
  echo "✅ 서비스 중지 완료"
else
  echo "ℹ️  실행 중인 서비스가 없습니다."
fi

rm -f "$PLIST_PATH"
echo "   plist 파일 삭제 완료"
