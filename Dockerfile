FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
CMD ["npm", "start"]
