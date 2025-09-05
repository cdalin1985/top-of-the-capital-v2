const { PrismaClient } = require('../generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const dbJsonPath = path.join(__dirname, '..', 'db.json');

async function main() {
  const dbRaw = fs.readFileSync(dbJsonPath, 'utf-8');
  const db = JSON.parse(dbRaw);
  if (!Array.isArray(db.users)) {
    console.error('No users array found in db.json');
    process.exit(1);
  }
  db.users.forEach(async (user, idx) => {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { rank: idx + 1 },
      create: {
        id: user.id,
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        avatar: user.avatar,
        createdAt: new Date(user.createdAt),
        rank: idx + 1
      }
    });
  });
  console.log('Users seeded successfully.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

