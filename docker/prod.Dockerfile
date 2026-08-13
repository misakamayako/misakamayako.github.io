FROM node:24 AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG SITE_URL
ENV SITE_URL=$SITE_URL
RUN pnpm build

# ---------- 运行阶段 ----------
FROM node:24 AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server/entry.mjs"]
