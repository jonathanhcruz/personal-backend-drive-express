# ---- build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ---- migrate stage ----
FROM node:20-alpine AS migrate
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY migrations/ ./migrations/
COPY scripts/ensure-db.js ./scripts/ensure-db.js
CMD ["sh", "-c", "node scripts/ensure-db.js && npm run migrate:up"]

# ---- production stage ----
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY scripts/ ./scripts/
EXPOSE 3000
CMD ["node", "dist/index.js"]
