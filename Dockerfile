FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV VT_PORT=2323

EXPOSE 8080
EXPOSE 2323

CMD ["npm", "start"]
