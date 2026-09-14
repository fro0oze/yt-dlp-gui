FROM node:20-slim AS web-builder

WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm install
COPY web/ ./
RUN npm run build

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    unzip \
  && rm -rf /var/lib/apt/lists/*

# curl_cffi enables browser impersonation, which extractors like TikTok now require
# to get past their bot checks (without it, yt-dlp only gets a stub challenge page)
RUN pip3 install --no-cache-dir --break-system-packages curl_cffi

# Install yt-dlp (ADD with a URL busts the Docker layer cache when the release changes,
# so rebuilds actually pick up new versions instead of freezing on the first build's binary)
ADD https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest /tmp/yt-dlp-latest.json
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
