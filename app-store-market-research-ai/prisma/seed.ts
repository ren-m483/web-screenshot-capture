import { PrismaClient } from "@prisma/client";
import { STOREFRONTS } from "../constants/storefronts";
import { APPLE_GENRES } from "../constants/apple-genres";

const prisma = new PrismaClient();

async function main() {
  for (const s of STOREFRONTS) {
    await prisma.storefront.upsert({
      where: { id: s.id },
      update: { name: s.name, defaultLang: s.defaultLang },
      create: { id: s.id, name: s.name, defaultLang: s.defaultLang },
    });
  }

  for (const g of APPLE_GENRES) {
    await prisma.genre.upsert({
      where: { id: g.id },
      update: { name: g.name, type: g.type },
      create: { id: g.id, name: g.name, type: g.type },
    });
  }

  console.log(`Seeded ${STOREFRONTS.length} storefronts and ${APPLE_GENRES.length} genres.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
