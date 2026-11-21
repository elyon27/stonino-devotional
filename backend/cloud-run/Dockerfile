FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs play-prayer-packs.mjs ./
USER node
CMD ["node", "server.mjs"]
