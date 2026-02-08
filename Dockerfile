# Backend Dockerfile (for Render or any Docker-based hosting)
FROM node:20-alpine AS base

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN npm install --production=false

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

# Generate Prisma client
RUN cd apps/server && npx prisma generate

# Build shared package
RUN npm run build -w @stream/shared 2>/dev/null || true

# Build server
RUN cd apps/server && npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules/ ./node_modules/
COPY --from=base /app/packages/ ./packages/
COPY --from=base /app/apps/server/dist/ ./apps/server/dist/
COPY --from=base /app/apps/server/package.json ./apps/server/
COPY --from=base /app/apps/server/node_modules/ ./apps/server/node_modules/
COPY --from=base /app/apps/server/prisma/ ./apps/server/prisma/

# Create uploads directory
RUN mkdir -p /app/apps/server/uploads

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

WORKDIR /app/apps/server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
