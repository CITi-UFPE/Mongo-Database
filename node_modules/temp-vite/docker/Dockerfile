# both stages must use alpine
FROM node:22 AS build

# Accept build arguments
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GEMINI_API_KEY

ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

WORKDIR /app

COPY package*.json ./

# Remove package-lock.json if it exists and do a fresh install
RUN rm -f package-lock.json
RUN npm install --include=optional --legacy-peer-deps

# relative to build context
COPY . ./

ENV NODE_ENV=production
RUN npm run build

#-----------------------

# this has no node, works only for CSR
FROM nginx:1-alpine

WORKDIR /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/*
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/build .
COPY --from=build /app/docker/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]