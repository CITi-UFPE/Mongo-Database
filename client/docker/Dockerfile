
# both stages must use alpine
FROM node:22-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

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