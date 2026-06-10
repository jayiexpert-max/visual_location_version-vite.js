# Visual Location API — multi-stage production image
# Build context: monorepo root (docker-compose sets context: ..)

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci --workspace=@visual-location/api --include-workspace-root

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run api:build

# ---------------------------------------------------------------------------

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci --workspace=@visual-location/api --include-workspace-root --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared ./packages/shared

WORKDIR /app/apps/api

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1

CMD ["node", "dist/apps/api/src/main.js"]
