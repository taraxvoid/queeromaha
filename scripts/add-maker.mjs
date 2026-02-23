#!/usr/bin/env node

import { neon } from '@netlify/neon';
import * as readline from 'readline';

const sql = neon();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function addMaker() {
  console.log('\n✨ Add a New Maker to the Database\n');

  // Required fields
  const human_name = (await question('Name (required): ')).trim();
  if (!human_name) {
    console.error('Error: Name is required');
    process.exit(1);
  }

  const email = (await question('Email (required): ')).trim();
  if (!email) {
    console.error('Error: Email is required');
    process.exit(1);
  }

  // Optional fields
  const biz_name = (await question('Business Name (optional): ')).trim() || null;
  const instagram = (await question('Instagram handle or URL (optional): ')).trim() || null;
  const facebook = (await question('Facebook URL or page name (optional): ')).trim() || null;
  const website = (await question('Website URL (optional): ')).trim() || null;
  const description = (await question('Description - max 280 chars (optional): ')).trim() || null;

  if (description && description.length > 280) {
    console.error('Error: Description must be 280 characters or less');
    process.exit(1);
  }

  const approved_str = (await question('Approve immediately? (y/n, default: n): ')).trim().toLowerCase();
  const approved = approved_str === 'y';

  rl.close();

  try {
    const res = await sql`
      INSERT INTO makers (human_name, email, biz_name, instagram, facebook, website, description, approved)
      VALUES (${human_name}, ${email}, ${biz_name}, ${instagram}, ${facebook}, ${website}, ${description}, ${approved})
      RETURNING id, human_name, biz_name, approved
    `;

    if (res?.length) {
      const maker = res[0];
      const name = maker.biz_name || maker.human_name;
      const status = maker.approved ? '✓ approved' : '⏳ pending approval';
      console.log(`\n✓ Added maker: ${name} (ID: ${maker.id}) — ${status}\n`);
      process.exit(0);
    } else {
      console.error('Error: Failed to insert maker');
      process.exit(2);
    }
  } catch (error) {
    console.error('Database error:', error.message);
    process.exit(3);
  }
}

addMaker();
