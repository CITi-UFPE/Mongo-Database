FROM node:18-alpine

ENV USER=node

# home folder node user
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

# relative to build context
COPY . ./
COPY package*.json ./

RUN chown -R node:node /home/node/app

RUN mkdir /home/node/.npm-global
RUN chown -R node:node /home/node/.npm-global

ENV PATH=/home/node/.npm-global/bin:$PATH
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

USER node
RUN npm i --location=global pm2

# Configure npm for better network reliability
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

ENV NODE_ENV=production
RUN npm install
RUN npm install -g rimraf mkdirp
RUN npm run build

CMD [ "pm2-runtime", "--no-autorestart", "npm", "--", "run", "docker:start:prod" ]
