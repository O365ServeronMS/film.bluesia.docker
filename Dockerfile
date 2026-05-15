# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_registry=https://registry.npmjs.org/
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs \
    && mkdir -p /cache/film-bluesia-net \
    && chown -R nextjs:nodejs /cache

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

USER nextjs
EXPOSE 3000

CMD ["npm", "start"]
