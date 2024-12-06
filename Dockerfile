FROM oven/bun:1

WORKDIR /usr/app

COPY . .

EXPOSE 3000
CMD [ "bun", "start" ]