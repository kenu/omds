# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

# Copy package dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose server port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start Node.js application
CMD ["node", "server.js"]
