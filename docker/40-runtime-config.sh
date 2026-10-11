#!/bin/sh
set -eu

api_base_url="${API_BASE_URL:-}"
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

printf 'window.MENU_CONFIG = Object.freeze({ apiBaseUrl: "%s" });\n' "$api_base_url" > /tmp/menu-runtime-config.js
