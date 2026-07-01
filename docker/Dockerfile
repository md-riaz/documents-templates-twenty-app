FROM twentycrm/twenty:latest

USER root

# Install Chromium for PDF generation (Alpine musl-native)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    font-noto \
    dbus

# Puppeteer: use system Chromium instead of downloading bundled
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER node
