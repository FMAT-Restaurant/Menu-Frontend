#!/bin/sh
set -eu

api_base_url="${API_BASE_URL:-}"
menu_id="${MENU_ID:-1}"
case "$api_base_url" in
  *[[:cntrl:]]*)
    echo 'API_BASE_URL must be a single-line HTTP(S) URL without query or fragment' >&2
    exit 1
    ;;
esac

if [ -n "$api_base_url" ] && ! printf '%s' "$api_base_url" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/%-]*)?$'; then
  echo 'API_BASE_URL must be an HTTP(S) URL without query or fragment' >&2
  exit 1
fi

case "$menu_id" in
  ''|*[!A-Za-z0-9._~-]*)
    echo 'MENU_ID must contain only letters, numbers, dot, underscore, tilde or hyphen' >&2
    exit 1
    ;;
esac

printf 'window.MENU_CONFIG = Object.freeze({ apiBaseUrl: "%s", menuId: "%s" });\n' "$api_base_url" "$menu_id" > /tmp/menu-runtime-config.js
