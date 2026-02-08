import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Créer un admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@xearn.com' },
    update: {},
    create: {
      email: 'admin@xearn.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'XEARN',
      role: 'ADMIN',
      status: 'ACTIVATED',
      wallet: { create: {} },
    },
  });
  console.log(`✅ Admin créé: ${admin.email}`);

  // Créer des tâches de test
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Regarder publicité MTN',
        description: 'Regardez cette publicité vidéo MTN pendant 30 secondes',
        type: 'VIDEO_AD',
        reward: 50,
        mediaUrl: 'https://example.com/video1.mp4',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Sondage - Habitudes digitales',
        description: 'Répondez à ce court sondage sur vos habitudes digitales',
        type: 'SURVEY',
        reward: 100,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Publicité Flooz Togo',
        description: 'Regardez cette publicité Flooz pendant 20 secondes',
        type: 'VIDEO_AD',
        reward: 75,
        mediaUrl: 'https://example.com/video2.mp4',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Cliquer sur offre T-Money',
        description: 'Visitez le site de T-Money via ce lien sponsorisé',
        type: 'CLICK_AD',
        reward: 30,
        externalUrl: 'https://example.com/tmoney',
      },
    }),
  ]);
  console.log(`✅ ${tasks.length} tâches créées`);

  console.log('🎉 Seed terminé !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
