const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.join(process.cwd(), 'dev.db')}`,
});
const prisma = new PrismaClient({ adapter });

async function test() {
  const user = await prisma.user.findUnique({
    where: { email: 'lintao@shytian.com' },
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('User:', user.nameZh, user.email);
  console.log('Hash:', user.password.substring(0, 30) + '...');

  const match = await bcrypt.compare('shytian2026', user.password);
  console.log('Password matches:', match);

  await prisma.$disconnect();
}

test().catch(console.error);
