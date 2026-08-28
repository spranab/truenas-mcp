FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
COPY src/ src/
RUN npm ci && npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ dist/

ENTRYPOINT ["node", "dist/cli.js"]
