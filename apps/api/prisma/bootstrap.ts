import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Passw0rd!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@vms.local' },
    update: {},
    create: {
      name: 'Ananya Rao',
      email: 'admin@vms.local',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log('Demo administrator is ready.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
