#!/usr/bin/env bash
# Kullanım: scripts/telegram.sh "mesaj"            → metin gönderir
#           scripts/telegram.sh "açıklama" dosya.apk → dosya gönderir
# TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID yoksa sessizce hiçbir şey yapmaz.
set -u
[ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ] && exit 0
API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
if [ $# -ge 2 ] && [ -f "$2" ]; then
  curl -s -F chat_id="$TELEGRAM_CHAT_ID" -F caption="$1" -F document=@"$2" "$API/sendDocument" >/dev/null
else
  curl -s --data-urlencode chat_id="$TELEGRAM_CHAT_ID" --data-urlencode text="$1" \
       --data-urlencode disable_web_page_preview=true "$API/sendMessage" >/dev/null
fi
exit 0
