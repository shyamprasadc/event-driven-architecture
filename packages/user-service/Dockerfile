# Multi-stage build for Node.js application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY lerna.json ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy user service package
COPY packages/user-service ./packages/user-service

# Install dependencies
RUN npm ci --only=production

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build user service
WORKDIR /app/packages/user-service
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/user-service/dist ./packages/user-service/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/user-service/package.json ./packages/user-service/package.json

# Install production dependencies only
WORKDIR /app/packages/shared
RUN npm ci --only=production

WORKDIR /app/packages/user-service
RUN npm ci --only=production

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["node", "dist/app.js"]
