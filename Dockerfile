# One-command self-hosting straight from this repo.
#
#   docker build -t yt-companion-site --build-arg SITE_DIR=examples/demo .
#   docker run --rm -p 8080:80 yt-companion-site        → http://localhost:8080
#
# SITE_DIR is any folder inside the build context that contains a config.yaml.
#
# SECRETS: the image build needs no API key. YT_API_KEY is used only by
# `yt-companion sync`, run outside Docker. .dockerignore excludes .env files,
# and only the built static site (dist/) reaches the final nginx image.
FROM node:22-alpine AS build
WORKDIR /opt/yt-companion
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bin ./bin
COPY src ./src
COPY theme ./theme
COPY templates ./templates
RUN npm link
ARG SITE_DIR=examples/demo
COPY ${SITE_DIR} /site
WORKDIR /site
RUN yt-companion build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null || exit 1
