FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV VT_PORT=2323
ENV TN5250_PORT=25250
ENV TN3270_PORT=23270

EXPOSE 8080

CMD ["npm", "start"]
