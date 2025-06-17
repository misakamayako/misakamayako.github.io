FROM node:24 AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile
COPY . .
RUN pnpm build

# ---------- 部署阶段 ----------
FROM nginx:latest AS production

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露默认端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
