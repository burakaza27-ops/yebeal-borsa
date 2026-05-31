# ============================================
# YEBEAL BORSA — Backend Dockerfile
# ============================================

FROM node:20-alpine

# Install build tools if native dependencies exist
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema first for client generation
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
