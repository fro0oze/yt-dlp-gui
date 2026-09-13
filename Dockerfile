FROM node:20-slim AS web-builder

WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm install
COPY web/ ./
RUN npm run build

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    unzip \
  && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

# Install deno
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY --from=web-builder /web/dist ./web/dist

RUN mkdir -p /downloads /data

EXPOSE 3000

CMD ["node", "server/server.js"]
