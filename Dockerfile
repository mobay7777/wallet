
FROM node:8-alpine

LABEL maintainer="aasim@rupx.io"

ENV HOST 0.0.0.0

WORKDIR /

RUN apk --no-cache --virtual deps add \
      python \
      make \
      g++ \
      bash \
      git \
      libpng-dev \
      nasm \
      autoconf \
      automake \
    && npm install -g \
      npm@latest \
      nuxt \
      dotenv \
      node-gyp \
      pm2

COPY package*json ./

RUN npm install

COPY  .

RUN npm run build \
    && apk del deps

EXPOSE 3000

ENTRYPOINT ["npm"]
CMD ["start"]
