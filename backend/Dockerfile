FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY src ./src
COPY scripts ./scripts
RUN PRISMA_SCHEMA_ENGINE_BINARY=/bin/true npx prisma generate \
  && chmod +x ./scripts/docker-entrypoint.sh \
  && mkdir -p uploads

EXPOSE 5000
CMD ["./scripts/docker-entrypoint.sh"]
