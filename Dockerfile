# ============================================
# YEBEAL BORSA — Frontend Dockerfile
# ============================================

# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build for production
RUN npm run build

# Stage 2: Serve the production build with Nginx
FROM nginx:alpine

# Copy built assets from stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
