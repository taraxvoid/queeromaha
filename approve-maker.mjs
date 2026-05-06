import { PrismaClient } from '@prisma/client';
import { PgAdapter } from '@prisma/adapter-pg';
import pg from 'pg';

function getPrisma() {
  const adapter = new PgAdapter(
    new pg.Pool({ connectionString: process.env.DATABASE_URL })
  );
  return new PrismaClient({ adapter });
}

const prisma = getPrisma();
const arg = process.argv[2];

// list: show unapproved makers
if (arg === 'list' || arg === 'ls') {
  const rows = await prisma.maker.findMany({
    where: { approved: false },
    orderBy: { id: 'asc' },
    select: { id: true, humanName: true, bizName: true, description: true }
  });
  if (rows.length === 0) {
    console.log('No unapproved makers.');
    process.exit(0);
  }
  console.log('Unapproved makers:');
  for (const r of rows) {
    const name = r.bizName || r.humanName;
    const desc = r.description ? ` — ${r.description.slice(0, 50)}${r.description.length > 50 ? '…' : ''}` : '';
    console.log(`  ${r.id}  ${name}${desc}`);
  }
  process.exit(0);
}

const id = Number(arg);
if (!id || id < 1) {
  console.error('Usage: bun approve-maker.mjs <id> [true|false]');
  console.error('       bun approve-maker.mjs list   # list unapproved makers');
  process.exit(1);
}
const approved = process.argv[3] === 'false' ? false : true;

try {
  const res = await prisma.maker.update({
    where: { id },
    data: { approved },
    select: { id: true, approved: true }
  });
  console.log('Approved Maker ID:', res);
} catch (e) {
  console.error('No maker found for id', id);
  process.exit(2);
} finally {
  await prisma.$disconnect();
}

