import { PrismaClient } from '@prisma/client';
import { PgAdapter } from '@prisma/adapter-pg';
import pg from 'pg';

function getPrisma() {
  const adapter = new PgAdapter(
    new pg.Pool({ connectionString: process.env.DATABASE_URL })
  );
  return new PrismaClient({ adapter });
}

function checkAuth(request) {
  const adminToken = process.env.MAKERS_ADMIN_TOKEN;
  const provided = request.headers.get('x-admin-token') || request.headers.get('X-Admin-Token');
  return adminToken && provided === adminToken;
}

export default async (request) => {
  if (!checkAuth(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const prisma = getPrisma();

  // GET: list unapproved makers
  if (request.method === 'GET') {
    try {
      const rows = await prisma.maker.findMany({
        where: { approved: false },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          humanName: true,
          bizName: true,
          email: true,
          instagram: true,
          facebook: true,
          website: true,
          description: true
        }
      });
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      console.error('makers-approve list error', e);
      return new Response('Server Error', { status: 500 });
    } finally {
      await prisma.$disconnect();
    }
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return new Response('Bad Request', { status: 400 });
  }

  const id = Number(body?.id);
  const approved = body?.approved === undefined ? true : Boolean(body.approved);
  if (!id || id < 1) {
    return new Response('Invalid id', { status: 400 });
  }

  try {
    const res = await prisma.maker.update({
      where: { id },
      data: { approved },
      select: { id: true, approved: true }
    });
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('makers-approve error', e);
    if (e.code === 'P2025') {
      return new Response('Not Found', { status: 404 });
    }
    return new Response('Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
};

export const config = { path: '/api/makers/approve' };