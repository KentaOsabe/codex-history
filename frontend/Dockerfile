FROM node:22-bookworm

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    xdg-utils \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

ENV PLAYWRIGHT_BROWSERS_PATH=/app/node_modules/.cache/ms-playwright
RUN npx playwright install --with-deps chromium

EXPOSE 5173 6006

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
