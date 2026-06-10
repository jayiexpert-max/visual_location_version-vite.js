# Visual Location API — standalone backend image
# Build context: backend/

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/

RUN npm ci --workspace=@visual-location/shared --include-workspace-root

COPY shared shared
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src src

RUN npm run build

# ---------------------------------------------------------------------------

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/

RUN npm ci --workspace=@visual-location/shared --include-workspace-root --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
