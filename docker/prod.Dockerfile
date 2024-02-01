FROM node:21.1 AS base

FROM base AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .

RUN npm run build

FROM base as runner
RUN npm i pm2 -g
WORKDIR /usr/src/app
RUN mkdir /nonexistent
#RUN mkdir /usr/local/lib/node_modules/pm2

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN chown nextjs:nodejs /nonexistent
RUN chown nextjs:nodejs /usr/local/lib/node_modules/pm2

USER nextjs


COPY --from=builder /usr/src/app/public ./public

COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static


CMD ["pm2-runtime", "server.js"]
