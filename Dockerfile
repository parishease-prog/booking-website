FROM node:18

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm ci --only=production

# Copy backend source code
COPY backend/src ./src
COPY backend/database ./database

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "src/server.js"]
