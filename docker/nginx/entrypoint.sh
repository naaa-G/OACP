#!/bin/sh
set -eu

OACP_UPSTREAM="${OACP_UPSTREAM:-http://oacp:3847}"
OACP_UPSTREAM_HOST="${OACP_UPSTREAM#http://}"
OACP_UPSTREAM_HOST="${OACP_UPSTREAM_HOST#https://}"
export OACP_UPSTREAM_HOST

if [ -n "${OACP_API_KEY:-}" ]; then
  export OACP_AUTH_INJECT="proxy_set_header Authorization \"Bearer ${OACP_API_KEY}\";"
else
  export OACP_AUTH_INJECT=""
fi

envsubst '${OACP_UPSTREAM_HOST} ${OACP_AUTH_INJECT}' \
  < /etc/nginx/templates/oacp-gateway.conf.template \
  > /etc/nginx/conf.d/default.conf

exec "$@"
