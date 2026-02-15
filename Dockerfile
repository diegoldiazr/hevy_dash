# Stage 1: Build React Frontend
FROM node:18-alpine as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup Server & Serve Frontend
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server code
COPY server/ ./

# Copy built frontend assets to server (comes after server code to ensure public/ is fresh)
COPY --from=client-build /app/client/dist /app/server/public

# Create directory for SQLite db
RUN mkdir -p /app/server/data

EXPOSE 3000
CMD ["node", "index.js"]
