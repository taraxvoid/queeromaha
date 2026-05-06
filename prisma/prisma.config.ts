import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bunx --bun scripts/seed-makers.mjs',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
        