# Node 22.17+ is a hard QVAC SDK requirement
FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 cmake git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

COPY models/medpsy-1.7b-q4_k_m-imat.gguf /app/models/medpsy-1.7b-q4_k_m-imat.gguf

ENTRYPOINT ["node", "dist/src/cli.js"]
