FROM node:latest AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:22-slim AS runner
WORKDIR /app
COPY . .
COPY --from=builder /app ./ 
CMD ["npm","run","dev"]