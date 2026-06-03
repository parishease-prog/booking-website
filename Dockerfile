FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm ci --only=production

# Copy backend source code
COPY backend/src ./src
COPY backend/database ./database
COPY backend/.env* ./

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "src/server.js"]
