# ====================================
# Multi-stage Dockerfile for Next.js + Python Agent
# ====================================

# ============ Stage 1: Dependencies ============
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============ Stage 2: Builder ============
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN pnpm build

# ============ Stage 3: Python Backend ============
FROM python:3.11-slim AS python-deps
WORKDIR /app/python-backend

# Install Python dependencies
RUN pip install --no-cache-dir \
    openai \
    litellm \
    python-dotenv \
    requests \
    agents

# Copy Python backend
COPY python-backend/ .

# ============ Stage 4: Runner ============
FROM node:20-alpine AS runner
WORKDIR /app

# Install Python and development tools
RUN apk add --no-cache \
    python3 \
    py3-pip \
    python3-dev \
    build-base \
    libffi-dev

# Install Python dependencies globally (before switching user)
RUN pip3 install --no-cache-dir --break-system-packages \
    openai \
    openai-agents \
    litellm \
    python-dotenv \
    requests \
    aiohttp \
    pydantic \
    typing-extensions \
    Pillow

# Install agents package (may have different dependencies)
# Already installed as openai-agents above

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Python backend
COPY --chown=nextjs:nodejs python-backend/ ./python-backend/

# Create uploads directory
RUN mkdir -p uploads/products && chown -R nextjs:nodejs uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://0.0.0.0:3000/', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
