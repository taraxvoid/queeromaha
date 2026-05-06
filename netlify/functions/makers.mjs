import { PrismaClient } from '@prisma/client';
import { PgAdapter } from '@prisma/adapter-pg';
import pg from 'pg';

function getPrisma() {
  const adapter = new PgAdapter(
    new pg.Pool({ connectionString: process.env.DATABASE_URL })
  );
  return new PrismaClient({ adapter });
}

export default async () => {
  const prisma = getPrisma();
  try {
    const rows = await prisma.maker.findMany({
      where: { approved: true },
      orderBy: {
        bizName: 'asc'
      },
      select: {
        id: true,
        humanName: true,
        bizName: true,
        instagram: true,
        facebook: true,
        website: true,
        description: true
      }
    });
    return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
  } catch (e) {
    console.error('makers api error:', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch makers' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  } finally {
    await prisma.$disconnect();
  }
};

export const config = { path: '/api/makers' };
