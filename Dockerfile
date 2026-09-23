FROM node:22-alpine
    WORKDIR /app

    # 1. Install dependencies
    COPY package*.json ./
    RUN npm install

    # 2. Copy source code
    COPY . .

    # 3. Build the Next.js app (This creates the optimized version)
    RUN npm run build

    # 4. Expose port and Start
    EXPOSE 3000
    CMD ["npm", "start"]