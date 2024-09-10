import { prisma, initializeDatabaseInstance } from '../src/server.js';

initializeDatabaseInstance();

async function main() {
  console.log('Seeding database users...');

  for (let i = 1; i <= 50; i++) {
    const name: string = 'User ' + i;
    const email: string = 'user' + i + '@seeded.com';

    await prisma.user.upsert({
      where: { email: email },
      update: {},
      create: {
        name: name,
        email: email,
        password: 'password123',
        birthDate: new Date('2000-01-01'),
      },
    });
  }

  console.log('Database seeding done.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
