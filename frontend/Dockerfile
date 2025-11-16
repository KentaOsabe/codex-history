FROM node:22-alpine

WORKDIR /app

# Storybook の `xdg-open` 呼び出しで ENOENT が発生しないよう xdg-utils を追加
RUN apk add --no-cache xdg-utils

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173 6006

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
