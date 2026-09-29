# Builds this site with yt-companion and serves it with nginx.
#   docker build -t my-channel-site .
#   docker run -p 8080:80 my-channel-site
FROM node:22-alpine AS build
# Point at a git URL / tarball if you haven't published yt-companion to npm, e.g.
#   --build-arg YTC_PKG=github:UncleSam906/yt-companion
ARG YTC_PKG=github:UncleSam906/yt-companion
RUN npm install -g ${YTC_PKG}
WORKDIR /site
COPY . .
RUN yt-companion build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null || exit 1
