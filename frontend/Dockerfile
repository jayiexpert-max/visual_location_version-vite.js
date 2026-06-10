# Visual Location Web — standalone frontend image
# Build context: frontend/

FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ARG VITE_SOCKET_URL=http://localhost:3000
ARG VITE_APP_NAME=Visual Location Management

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

COPY package.json package-lock.json ./

RUN npm ci

COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src src

RUN npm run build

# ---------------------------------------------------------------------------

FROM nginx:1.27-alpine AS runner

COPY docker/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
