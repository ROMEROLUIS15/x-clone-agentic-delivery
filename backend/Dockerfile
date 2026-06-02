FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma/schema.postgres.prisma ./prisma/schema.prisma
COPY prisma/ ./prisma/
COPY . .
RUN npx prisma generate
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
