FROM node:20-alpine AS deps
WORKDIR /app
COPY ../../package.json ../../pnpm-workspace.yaml ./
COPY ../../pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable && pnpm i --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY ../../packages ./packages
COPY ../../prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules
RUN corepack enable && pnpm -w prisma generate && pnpm -w turbo run build --filter=@garangbi/server...

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
CMD ["node", "dist/main.js"]
