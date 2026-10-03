# ─── Stage 1: Base ───────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./

# ─── Stage 2: Dependencies ───────────────────────────────────────────────────
FROM base AS deps
RUN npm ci --omit=dev

# ─── Stage 3: Builder ────────────────────────────────────────────────────────
FROM base AS builder
RUN npm ci
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npm run build

# ─── Stage 4: Development ────────────────────────────────────────────────────
FROM base AS development
RUN npm ci
COPY tsconfig*.json ./
COPY src/ ./src/
ENV NODE_ENV=development
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ─── Stage 5: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache dumb-init

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled JS output
COPY --from=builder /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production
# Run as non-root user for security
USER node
EXPOSE 4000

# dumb-init handles PID 1 signal forwarding (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]
