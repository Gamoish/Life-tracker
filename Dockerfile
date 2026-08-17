# Debian slim rather than Alpine: Tailwind v4 pulls native lightningcss binaries,
# and glibc builds are the well-trodden path there.
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- deps ----------------------------------------------------------------
# Full install (including devDependencies) — the running container also needs
# tsx + drizzle-kit so `db:migrate` and `seed:roadmaps` can run inside it.
FROM base AS deps
# Playwright is a devDependency used only for host-side e2e runs; the image has
# no use for its browsers and downloading them would add ~150MB per build.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder -------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner --------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json tsconfig.json drizzle.config.ts ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY seeds ./seeds
COPY src ./src

EXPOSE 3000
CMD ["npm", "run", "start"]
