#!/bin/sh
set -eu

# Genera /runtime-config.js (window.MENU_CONFIG) a partir de las variables del contenedor.
# Vacío = rutas relativas al mismo origen. No colocar secretos: el navegador lee estos valores.

validate_url() {
  name="$1"
  value="$2"
  case "$value" in
    *[[:cntrl:]]*)
      echo "$name must be a single-line HTTP(S) URL without query or fragment" >&2
      exit 1
      ;;
  esac
  if [ -n "$value" ] && ! printf '%s' "$value" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/%-]*)?$'; then
    echo "$name must be an HTTP(S) URL without query or fragment" >&2
    exit 1
  fi
}

api_base_url="${API_BASE_URL:-}"
inventory_api_base_url="${INVENTORY_API_BASE_URL:-}"
validate_url API_BASE_URL "$api_base_url"
validate_url INVENTORY_API_BASE_URL "$inventory_api_base_url"

printf 'window.MENU_CONFIG = Object.freeze({ apiBaseUrl: "%s", inventoryApiBaseUrl: "%s" });\n' \
  "$api_base_url" "$inventory_api_base_url" > /tmp/menu-runtime-config.js
