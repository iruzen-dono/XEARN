import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin credentials from environment or defaults
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@xearn.local';
  const rawPassword = process.env.ADMIN_PASSWORD || 'CHANGE_ME_BEFORE_DEPLOY';

  // Validation: refuse weak placeholder passwords in production-like environments
  if (rawPassword === 'CHANGE_ME_BEFORE_DEPLOY' || rawPassword === 'Admin1234') {
    throw new Error(
      'ADMIN_PASSWORD must be changed before deployment. Set a strong password in your .env file.',
    );
  }

  const adminPassword = await bcrypt.hash(rawPassword, 12);
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'XEARN';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'ADMIN',
      status: 'ACTIVATED',
      provider: 'LOCAL',
      googleId: null,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
    create: {
      email: adminEmail,
      password: adminPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'ADMIN',
      status: 'ACTIVATED',
      provider: 'LOCAL',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });
  console.log(`✅ Admin créé: ${admin.email}`);

  // Sample tasks — upsert by title to prevent duplicates on re-seed
  const taskData = [
    {
      title: 'Regarder publicité MTN',
      description: 'Regardez cette publicité vidéo MTN pendant 30 secondes',
      type: 'VIDEO_AD' as const,
      reward: 50,
      mediaUrl: 'https://example.com/video1.mp4',
    },
    {
      title: 'Sondage - Habitudes digitales',
      description: 'Répondez à ce court sondage sur vos habitudes digitales',
      type: 'SURVEY' as const,
      reward: 100,
    },
    {
      title: 'Publicité Flooz Togo',
      description: 'Regardez cette publicité Flooz pendant 20 secondes',
      type: 'VIDEO_AD' as const,
      reward: 75,
      mediaUrl: 'https://example.com/video2.mp4',
    },
    {
      title: 'Cliquer sur offre T-Money',
      description: 'Visitez le site de T-Money via ce lien sponsorisé',
      type: 'CLICK_AD' as const,
      reward: 30,
      externalUrl: 'https://example.com/tmoney',
    },
  ];

  let created = 0;
  for (const t of taskData) {
    const existing = await prisma.task.findFirst({ where: { title: t.title } });
    if (!existing) {
      await prisma.task.create({ data: t });
      created++;
    }
  }
  console.log(`✅ ${created} tâche(s) créée(s) (${taskData.length - created} existaient déjà)`);

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
