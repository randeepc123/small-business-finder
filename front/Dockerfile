# ── Frontend Dockerfile ───────────────────────────────────────────────────────
# Multi-stage: build React app with Node, then serve with nginx
FROM node:20-alpine AS build

WORKDIR /app

# Install deps (cached layer)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy built React files
COPY --from=build /app/dist /usr/share/nginx/html

# nginx config: route all requests to index.html (SPA fallback)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
