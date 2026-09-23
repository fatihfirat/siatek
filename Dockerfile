# Base image (LTS version of Node.js)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and lock files
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application (Vite frontend + esbuild backend)
RUN npm run build

# --- Production Image ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy built assets and backend script from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Sadece production bağımlılıklarını kur (Vite/esbuild'e gerek yok)
RUN npm install --omit=dev

# Uygulama portunu dışarı aç (Express varsayılan 3000)
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "dist/server.cjs"]
