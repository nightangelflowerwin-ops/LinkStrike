FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.js world.js ./
COPY public ./public
ENV PORT=4173
EXPOSE 4173
USER node
CMD ["node", "server.js"]
