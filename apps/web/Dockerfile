FROM node:20-alpine AS builder
WORKDIR /app
COPY ../../package.json ../../pnpm-workspace.yaml ./
COPY ../../pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && pnpm i --frozen-lockfile
COPY . .
COPY ../../packages ./packages
RUN pnpm -w turbo run build --filter=@garangbi/web...

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
