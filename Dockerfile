FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ARG NEXT_PUBLIC_API_BASE=https://assinatura-digital-despesas.onrender.com
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
RUN npm run build
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
CMD ["npm", "start"]
