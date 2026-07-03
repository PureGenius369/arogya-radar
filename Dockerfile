# Arogya Radar — Cloud Run deployment
# gcloud run deploy arogya-radar --source . --region asia-south1 --allow-unauthenticated \
#   --set-env-vars GEMINI_API_KEY=<key>

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node data/generate.mjs && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
