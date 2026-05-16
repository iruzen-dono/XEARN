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

  // Sample tasks — upsert by slug to prevent duplicates on re-seed
  const taskData = [
    // Tâches de parrainage avec code de vérification
    {
      title: 'Inscription ySense',
      slug: 'ysense-signup',
      description: 'Inscrivez-vous sur ySense et complétez votre profil pour gagner 50 FCFA',
      instructions: `**Instructions :**
1. Cliquez sur le bouton ci-dessous pour vous inscrire sur ySense
2. Créez votre compte avec une adresse email valide
3. Complétez votre profil à 100%
4. Revenez ici et entrez le code de vérification affiché ci-dessus

**Important :** Vous devez compléter ces étapes pour recevoir votre récompense.`,
      type: 'EXTERNAL' as const,
      reward: 50,
      referralLink: 'https://www.ysense.com/?rb=234640632',
      requiresCode: true,
      maxCompletions: 1000,
    },
    {
      title: 'Inscription Freecash',
      slug: 'freecash-signup',
      description: 'Rejoignez Freecash et validez votre compte pour gagner 50 FCFA',
      instructions: `**Instructions :**
1. Cliquez sur le bouton pour rejoindre Freecash
2. Créez votre compte
3. Vérifiez votre email
4. Revenez et entrez le code de vérification

**Bonus :** Freecash offre également des récompenses supplémentaires après inscription !`,
      type: 'EXTERNAL' as const,
      reward: 50,
      referralLink: 'https://freecash.com/r/MXWFC',
      requiresCode: true,
      maxCompletions: 1000,
    },
    {
      title: 'Inscription Timebucks',
      slug: 'timebucks-signup',
      description: 'Créez votre compte Timebucks et commencez à gagner',
      instructions: `**Instructions :**
1. Inscrivez-vous sur Timebucks via le lien ci-dessous
2. Créez votre compte
3. Complétez les premières tâches du tutoriel
4. Retournez sur XEARN et validez avec le code

**Note :** Timebucks propose également des tâches quotidiennes rémunérées !`,
      type: 'EXTERNAL' as const,
      reward: 50,
      referralLink: 'https://timebucks.com/?refID=228859787',
      requiresCode: true,
      maxCompletions: 1000,
    },
    // Tâches simples sans code
    {
      title: 'Regarder publicité MTN',
      slug: 'mtn-video-ad',
      description: 'Regardez cette publicité vidéo MTN pendant 30 secondes',
      type: 'VIDEO_AD' as const,
      reward: 50,
      mediaUrl: 'https://example.com/video1.mp4',
    },
    {
      title: 'Sondage - Habitudes digitales',
      slug: 'survey-digital-habits',
      description: 'Répondez à ce court sondage sur vos habitudes digitales',
      type: 'SURVEY' as const,
      reward: 100,
    },
    {
      title: 'Publicité Flooz Togo',
      slug: 'flooz-video-ad',
      description: 'Regardez cette publicité Flooz pendant 20 secondes',
      type: 'VIDEO_AD' as const,
      reward: 75,
      mediaUrl: 'https://example.com/video2.mp4',
    },
  ];

  let created = 0;
  for (const t of taskData) {
    const existing = t.slug
      ? await prisma.task.findFirst({ where: { slug: t.slug } })
      : await prisma.task.findFirst({ where: { title: t.title } });

    if (!existing) {
      await prisma.task.create({ data: t });
      created++;
    } else if (
      t.slug &&
      (existing.referralLink !== t.referralLink || existing.requiresCode !== t.requiresCode)
    ) {
      // Update existing tasks with new referral links or requiresCode flag
      await prisma.task.update({
        where: { id: existing.id },
        data: {
          referralLink: t.referralLink,
          instructions: t.instructions,
          requiresCode: t.requiresCode,
        },
      });
      console.log(`🔄 Tâche mise à jour: ${t.title}`);
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
