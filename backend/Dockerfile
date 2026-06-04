FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma/ ./prisma/
# This image targets PostgreSQL: use the Postgres schema (overwrite the dev
# SQLite one) BEFORE install so the postinstall `prisma generate` produces a
# Postgres client. Copied surgically (no `COPY . .`) so the SQLite schema is
# never reintroduced.
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma
RUN npm ci
# tsconfig.typecheck.json is needed because `npm run build` also type-checks
# prisma/seed.ts (which is already present from the COPY prisma/ above).
COPY tsconfig.json tsconfig.typecheck.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts && node dist/index.js"]
