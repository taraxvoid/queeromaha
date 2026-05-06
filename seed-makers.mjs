import { PrismaClient } from "./src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";


function getPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = getPrisma();

  const seed = [
    {
      humanName: 'Moth',
      bizName: 'Gutter Glitter Zines',
      email: 'moth@example.com',
      instagram: '@gutter_glitter',
      facebook: null,
      website: 'https://gutterglitter.example',
      description: 'DIY zines about queer joy and rage. Staples, xerox, neon ink. Limited runs.'
    },
    {
      humanName: 'Ash',
      bizName: 'Hex Stitch Co.',
      email: 'ash@example.com',
      instagram: '@hexstitchco',
      facebook: 'hexstitchco',
      website: null,
      description: 'Hand-embroidered patches + upcycled denim. Sliding scale, trades welcome.'
    }
  ];

  for (const m of seed) {
    await prisma.maker.create({
      data: m
    });
  }

  console.log('✓ Seeded example makers');
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  });
