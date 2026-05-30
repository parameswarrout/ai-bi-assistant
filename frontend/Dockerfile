FROM node:18-alpine

WORKDIR /app

COPY package.json ./

# Install dependencies
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
