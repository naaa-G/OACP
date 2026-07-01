# OACP nginx gateway — injects Authorization for browser clients (Day 52 enterprise path).
# syntax=docker/dockerfile:1

FROM nginx:1.27-alpine

RUN apk add --no-cache gettext

COPY oacp-gateway.conf.template /etc/nginx/templates/oacp-gateway.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
