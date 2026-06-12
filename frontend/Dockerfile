FROM node:22-alpine AS builder

WORKDIR /app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

RUN apk add --no-cache shadow && \
    adduser -D -H -u 10001 -s /sbin/nologin appuser && \
    chown -R appuser:appuser /var/cache/nginx /var/run /etc/nginx/nginx.conf && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid && \
    apk del shadow

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

USER appuser

CMD ["nginx", "-g", "daemon off;"]
