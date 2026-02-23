#!/usr/bin/env node

import { neon } from '@netlify/neon';

const sql = neon();
const args = process.argv.slice(2);

async function listApproved() {
  const rows = await sql`
    SELECT id, human_name, biz_name, description
    FROM makers
    WHERE approved = true
    ORDER BY id ASC
  `;
  if (rows.length === 0) {
    console.log('No approved makers.');
    return;
  }
  console.log('Approved makers:');
  for (const r of rows) {
    const name = r.biz_name || r.human_name;
    const desc = r.description ? ` — ${r.description.slice(0, 50)}${r.description.length > 50 ? '…' : ''}` : '';
    console.log(`  ${r.id}  ${name}${desc}`);
  }
}

// Default: list approved makers
if (args.length === 0 || args[0] === 'list' || args[0] === 'ls') {
  await listApproved();
  process.exit(0);
}

// Parse IDs from comma or space-separated arguments
const ids = args[0]
  .split(/[,\s]+/)
  .map(id => Number(id.trim()))
  .filter(id => id > 0);

if (ids.length === 0) {
  console.error('Usage: bun unapprove <id|id1,id2,id3>   # unapprove maker(s)');
  console.error('       bun unapprove                     # list approved makers');
  process.exit(1);
}

// Update all makers to unapproved
const res = await sql`UPDATE makers SET approved = false WHERE id = ANY(${ids}::int[]) RETURNING id`;

if (res?.length === 0) {
  console.error(`No makers found for IDs: ${ids.join(', ')}`);
  process.exit(2);
}

console.log(`✓ Unapproved ${res.length} maker${res.length > 1 ? 's' : ''}:`);
res.forEach(r => console.log(`  ID ${r.id}`));
