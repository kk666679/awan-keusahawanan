FROM node:22-alpine

WORKDIR /app

# Install Python and build dependencies for some Hugging Face libraries
RUN apk add --no-cache python3 py3-pip make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
