# syntax=docker/dockerfile:1.7

# ---------- Stage 1: deps ----------
# Install production + build dependencies using a clean, reproducible install.
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma's engines need OpenSSL on Alpine.
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---------- Stage 2: builder ----------
# Generate the Prisma client and build the Next.js app (standalone output).
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client must be generated BEFORE `next build` because the build
# imports from `src/generated/prisma`.
RUN npx prisma generate

# Disable Next.js telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ---------- Stage 3: runner ----------
# Minimal runtime image. Runs the standalone Next.js server as the non-root
# `node` user that ships with the official node images.
FROM node:22-alpine AS runner
WORKDIR /app

# Prisma engines (query engine binary) need OpenSSL at runtime too.
RUN apk add --no-cache openssl bash

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Persistent uploads directory. The compose file mounts a named volume here.
RUN mkdir -p /data/uploads && chown -R node:node /data

# Copy the standalone server output. `.next/standalone` already includes a
# trimmed `node_modules` with only the deps needed at runtime.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Prisma: the generated client lives outside .next, and the schema is needed
# by the engines at runtime. Copy full node_modules so prisma CLI has its
# complete dependency tree (effect, fast-check, etc.) for migrate deploy.
COPY --from=builder --chown=node:node /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

USER node

EXPOSE 3000

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
