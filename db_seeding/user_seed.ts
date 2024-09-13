import { prisma, initializeDatabaseInstance } from '../src/database.js';

initializeDatabaseInstance();

async function main() {
  console.log('Seeding database users...');

  const users = [];
  for (let i = 1; i <= 50; i++) {
    const name: string = 'User ' + i;
    const email: string = 'user' + i + '@seeded.com';

    users.push({
      name: name,
      email: email,
      password: 'password123',
      birthDate: new Date('2000-01-01'),
    });
  }

  await prisma.user.createMany({ data: users, skipDuplicates: true });

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
