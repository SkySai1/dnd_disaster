# Build the client bundle
FROM node:18-alpine AS client-build
WORKDIR /app

# Copy only package manifests first for better caching
COPY package.json ./
COPY client/package.json ./client/package.json

# Install client dependencies and build
RUN npm --prefix client install
COPY client ./client
RUN npm --prefix client run build

# Runtime image
FROM node:18-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    WS_HOST=0.0.0.0 \
    WS_PORT=3000 \
    PORT=3000 \
    PUBLIC_WS_URL=ws://localhost:3000 \
    WS_PUBLIC_URL=ws://localhost:3000 \
    VITE_CONFIG_PROXY_TARGET=http://localhost:3000

COPY server ./server
COPY server.js ./server.js
COPY package.json ./package.json
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server/index.js"]
