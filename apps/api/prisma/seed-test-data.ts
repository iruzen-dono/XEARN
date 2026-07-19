import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding comprehensive test data...\n');

  const password = await bcrypt.hash('Test1234!', 12);

  // ─── 1. Créer les utilisateurs de test ─────────────────────────
  const usersData = [
    {
      email: 'alice@test.com',
      firstName: 'Alice',
      lastName: 'Koffi',
      role: 'USER' as const,
      tier: 'VIP' as const,
      status: 'ACTIVATED' as const,
    },
    {
      email: 'bob@test.com',
      firstName: 'Bob',
      lastName: 'Mensah',
      role: 'USER' as const,
      tier: 'PREMIUM' as const,
      status: 'ACTIVATED' as const,
    },
    {
      email: 'charlie@test.com',
      firstName: 'Charlie',
      lastName: 'Sow',
      role: 'USER' as const,
      tier: 'NORMAL' as const,
      status: 'ACTIVATED' as const,
    },
    {
      email: 'diana@test.com',
      firstName: 'Diana',
      lastName: 'Toure',
      role: 'USER' as const,
      tier: 'NORMAL' as const,
      status: 'FREE' as const,
    },
    {
      email: 'evan@test.com',
      firstName: 'Evan',
      lastName: 'Diallo',
      role: 'USER' as const,
      tier: 'NORMAL' as const,
      status: 'SUSPENDED' as const,
    },
    {
      email: 'fiona@test.com',
      firstName: 'Fiona',
      lastName: 'Kone',
      role: 'PARTNER' as const,
      tier: 'PREMIUM' as const,
      status: 'ACTIVATED' as const,
    },
  ];

  const users: { id: string; email: string; referralCode: string }[] = [];
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { status: u.status, tier: u.tier },
      create: {
        ...u,
        password,
        provider: 'LOCAL',
        emailVerifiedAt: new Date(),
        wallet: { create: { balance: 0, totalEarned: 0 } },
      },
    });
    users.push({ id: user.id, email: user.email, referralCode: user.referralCode });
    console.log(`  👤 ${u.firstName} ${u.lastName} (${u.role}, ${u.tier}, ${u.status})`);
  }

  // ─── 2. Références (chain à 3 niveaux) ──────────────────────
  // Alice (VIP) → Bob (PREMIUM) → Charlie (NORMAL)
  // Bob (PREMIUM) → Diana (FREE)
  // Fiona (PARTNER) → Evan (SUSPENDED)
  const referralChain = [
    { referrer: users[0], referred: users[1] }, // Alice → Bob
    { referrer: users[1], referred: users[2] }, // Bob → Charlie
    { referrer: users[1], referred: users[3] }, // Bob → Diana
    { referrer: users[4], referred: users[5] }, // Eva... wait, wrong order
  ];

  // Fix order: Fiona (index 5) is ref'd by no one, Evan (4) ref'd by Fiona
  // Let me redo: Alice (0) → Bob (1) → Charlie (2), Alice → Diana (3), Fiona (5) → Evan (4)
  const refs = [
    { referrer: users[0], referred: users[1] },
    { referrer: users[1], referred: users[2] },
    { referrer: users[0], referred: users[3] },
    { referrer: users[5], referred: users[4] },
  ];

  for (const { referrer, referred } of refs) {
    await prisma.user.update({
      where: { id: referred.id },
      data: { referredById: referrer.id },
    });
    console.log(`  🔗 ${referrer.email} → ${referred.email}`);
  }

  // ─── 3. Wallets ──────────────────────────────────────────────
  const walletUpdates = [
    { email: 'alice@test.com', balance: 15000, totalEarned: 45000 },
    { email: 'bob@test.com', balance: 8500, totalEarned: 22000 },
    { email: 'charlie@test.com', balance: 3200, totalEarned: 12000 },
    { email: 'diana@test.com', balance: 0, totalEarned: 500 },
    { email: 'evan@test.com', balance: 0, totalEarned: 800 },
    { email: 'fiona@test.com', balance: 50000, totalEarned: 120000 },
  ];
  for (const w of walletUpdates) {
    await prisma.wallet.update({
      where: { userId: users.find((u) => u.email === w.email)!.id },
      data: { balance: w.balance, totalEarned: w.totalEarned },
    });
  }

  // ─── 4. Tâches ───────────────────────────────────────────────
  const tasksData = [
    {
      title: 'Inscription ySense',
      slug: 'ysense-signup',
      description: 'Inscrivez-vous sur ySense et complétez votre profil pour gagner 50 FCFA',
      type: 'EXTERNAL' as const,
      reward: 50,
      referralLink: 'https://www.ysense.com/?rb=234640632',
      requiresCode: true,
      maxCompletions: 1000,
      completionCount: 150,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Inscription Freecash',
      slug: 'freecash-signup',
      description: 'Rejoignez Freecash et validez votre compte pour gagner 50 FCFA',
      type: 'EXTERNAL' as const,
      reward: 50,
      referralLink: 'https://freecash.com/r/MXWFC',
      requiresCode: true,
      maxCompletions: 1000,
      completionCount: 85,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Regarder publicité MTN',
      slug: 'mtn-video-ad',
      description: 'Regardez cette publicité vidéo MTN pendant 30 secondes',
      type: 'VIDEO_AD' as const,
      reward: 50,
      mediaUrl: 'https://example.com/mtn-ad.mp4',
      status: 'ACTIVE' as const,
    },
    {
      title: 'Sondage - Habitudes digitales',
      slug: 'survey-digital-habits',
      description: 'Répondez à ce court sondage sur vos habitudes digitales',
      type: 'SURVEY' as const,
      reward: 100,
      status: 'ACTIVE' as const,
    },
    {
      title: 'Publicité Flooz Togo',
      slug: 'flooz-video-ad',
      description: 'Regardez cette publicité Flooz pendant 20 secondes',
      type: 'VIDEO_AD' as const,
      reward: 75,
      mediaUrl: 'https://example.com/flooz-ad.mp4',
      status: 'PAUSED' as const,
    },
    {
      title: 'Sponsorisé - Orange Money',
      slug: 'orange-money-sponsored',
      description: 'Découvrez les avantages Orange Money et gagnez 150 FCFA',
      type: 'SPONSORED' as const,
      reward: 150,
      instructions: 'Cliquez sur le lien et créez votre compte Orange Money',
      requiredTier: 'PREMIUM' as const,
      maxCompletions: 500,
      completionCount: 23,
      status: 'ACTIVE' as const,
    },
  ];

  for (const t of tasksData) {
    await prisma.task.upsert({
      where: { slug: t.slug! },
      update: { completionCount: t.completionCount || 0, status: t.status },
      create: t,
    });
  }
  console.log(`  📋 ${tasksData.length} tâches`);

  // ─── 5. Task Completions ─────────────────────────────────────
  const tasks = await prisma.task.findMany();
  const taskMap = new Map(tasks.map((t) => [t.slug!, t]));

  // Clean existing completions for test users
  await prisma.taskCompletion.deleteMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });

  const completions = [
    { user: users[0], taskSlug: 'ysense-signup', count: 1 },
    { user: users[0], taskSlug: 'mtn-video-ad', count: 1 },
    { user: users[0], taskSlug: 'survey-digital-habits', count: 1 },
    { user: users[0], taskSlug: 'freecash-signup', count: 1 },
    { user: users[0], taskSlug: 'flooz-video-ad', count: 1 },
    { user: users[1], taskSlug: 'freecash-signup', count: 1 },
    { user: users[1], taskSlug: 'mtn-video-ad', count: 1 },
    { user: users[1], taskSlug: 'survey-digital-habits', count: 1 },
    { user: users[1], taskSlug: 'orange-money-sponsored', count: 1 },
    { user: users[2], taskSlug: 'mtn-video-ad', count: 1 },
    { user: users[2], taskSlug: 'survey-digital-habits', count: 1 },
    { user: users[3], taskSlug: 'mtn-video-ad', count: 1 },
    { user: users[4], taskSlug: 'ysense-signup', count: 1 },
    { user: users[5], taskSlug: 'orange-money-sponsored', count: 1 },
    { user: users[5], taskSlug: 'ysense-signup', count: 1 },
    { user: users[5], taskSlug: 'mtn-video-ad', count: 1 },
  ];

  let tcCount = 0;
  for (const { user, taskSlug, count } of completions) {
    const task = taskMap.get(taskSlug);
    if (!task) continue;
    for (let i = 0; i < count; i++) {
      const date = new Date(Date.now() - (count - i) * 86400000);
      await prisma.taskCompletion.create({
        data: {
          userId: user.id,
          taskId: task.id,
          earned: task.reward,
          createdAt: date,
        },
      });
      tcCount++;
    }
  }
  console.log(`  ✅ ${tcCount} complétions de tâches`);

  // ─── 6. Transactions ─────────────────────────────────────────
  const txTypes = ['TASK_EARNING', 'REFERRAL_L1', 'REFERRAL_L2', 'WITHDRAWAL'] as const;
  const txStatuses = ['COMPLETED', 'PENDING', 'FAILED'] as const;
  const txCount = 20;
  for (let i = 0; i < txCount; i++) {
    const user = users[i % users.length];
    const type = txTypes[i % txTypes.length];
    const status =
      i < 15 ? ('COMPLETED' as const) : i < 18 ? ('PENDING' as const) : ('FAILED' as const);
    const date = new Date(Date.now() - i * 86400000 * 2);
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type,
        status,
        amount: type === 'WITHDRAWAL' ? -500 : 50 + Math.floor(Math.random() * 100),
        description: `${type === 'TASK_EARNING' ? 'Gain tâche' : type === 'WITHDRAWAL' ? 'Retrait' : 'Commission parrainage'}`,
        createdAt: date,
      },
    });
  }
  console.log(`  💰 ${txCount} transactions`);

  // ─── 7. Withdrawals ──────────────────────────────────────────
  const wMethods = ['MTN_MOMO', 'TMONEY', 'ORANGE_MONEY', 'FLOOZ'] as const;
  const wStatuses = ['COMPLETED', 'PENDING', 'PROCESSING', 'FAILED'] as const;
  const wCount = 8;
  for (let i = 0; i < wCount; i++) {
    const user = i < 4 ? users[0] : users[1];
    const status = wStatuses[i % wStatuses.length];
    const date = new Date(Date.now() - i * 86400000 * 3);
    await prisma.withdrawal.create({
      data: {
        userId: user.id,
        amount: 500 + i * 200,
        method: wMethods[i % wMethods.length],
        status,
        accountInfo: `+228${90000000 + i}`,
        processedAt: status === 'COMPLETED' ? new Date(date.getTime() + 3600000) : null,
        createdAt: date,
      },
    });
  }
  console.log(`  💸 ${wCount} retraits`);

  // ─── 8. Streaks ──────────────────────────────────────────────
  const streakData = [
    { email: 'alice@test.com', current: 12, longest: 15 },
    { email: 'bob@test.com', current: 7, longest: 7 },
    { email: 'charlie@test.com', current: 3, longest: 5 },
    { email: 'fiona@test.com', current: 25, longest: 30 },
  ];
  for (const s of streakData) {
    const user = users.find((u) => u.email === s.email)!;
    await prisma.userStreak.upsert({
      where: { userId: user.id },
      update: { currentStreak: s.current, longestStreak: s.longest, lastActivityDate: new Date() },
      create: {
        userId: user.id,
        currentStreak: s.current,
        longestStreak: s.longest,
        lastActivityDate: new Date(),
      },
    });
  }
  console.log(`  🔥 ${streakData.length} streaks`);

  // ─── 9. Badges ───────────────────────────────────────────────
  const badgesData = [
    {
      code: 'streak_3',
      name: 'Flamme 3 jours',
      description: 'Maintenez une série de 3 jours consécutifs',
      icon: '🔥',
      category: 'STREAK' as const,
      threshold: 3,
      reward: 100,
    },
    {
      code: 'streak_7',
      name: 'Flamme 7 jours',
      description: 'Maintenez une série de 7 jours consécutifs',
      icon: '🔥',
      category: 'STREAK' as const,
      threshold: 7,
      reward: 300,
    },
    {
      code: 'streak_30',
      name: 'Flamme 30 jours',
      description: 'Maintenez une série de 30 jours consécutifs',
      icon: '🔥',
      category: 'STREAK' as const,
      threshold: 30,
      reward: 1500,
    },
    {
      code: 'tasks_10',
      name: 'Premiers pas',
      description: 'Complétez 10 tâches',
      icon: '🎯',
      category: 'TASKS' as const,
      threshold: 10,
      reward: 100,
    },
    {
      code: 'tasks_50',
      name: 'Travailleur',
      description: 'Complétez 50 tâches',
      icon: '💼',
      category: 'TASKS' as const,
      threshold: 50,
      reward: 500,
    },
    {
      code: 'tasks_100',
      name: 'Expert',
      description: 'Complétez 100 tâches',
      icon: '🏆',
      category: 'TASKS' as const,
      threshold: 100,
      reward: 1000,
    },
    {
      code: 'tasks_500',
      name: 'Légende',
      description: 'Complétez 500 tâches',
      icon: '👑',
      category: 'TASKS' as const,
      threshold: 500,
      reward: 5000,
    },
    {
      code: 'referrals_3',
      name: 'Recruteur',
      description: 'Parrainez 3 personnes',
      icon: '🤝',
      category: 'REFERRALS' as const,
      threshold: 3,
      reward: 200,
    },
    {
      code: 'referrals_10',
      name: 'Influenceur',
      description: 'Parrainez 10 personnes',
      icon: '📢',
      category: 'REFERRALS' as const,
      threshold: 10,
      reward: 1000,
    },
    {
      code: 'referrals_50',
      name: 'Meneur',
      description: 'Parrainez 50 personnes',
      icon: '🌟',
      category: 'REFERRALS' as const,
      threshold: 50,
      reward: 5000,
    },
    {
      code: 'earnings_10000',
      name: 'Début prometteur',
      description: 'Gagnez 10 000 FCFA au total',
      icon: '💰',
      category: 'EARNINGS' as const,
      threshold: 10000,
      reward: 500,
    },
    {
      code: 'earnings_50000',
      name: 'Gros gain',
      description: 'Gagnez 50 000 FCFA au total',
      icon: '💎',
      category: 'EARNINGS' as const,
      threshold: 50000,
      reward: 2000,
    },
    {
      code: 'earnings_100000',
      name: 'Fortune',
      description: 'Gagnez 100 000 FCFA au total',
      icon: '🚀',
      category: 'EARNINGS' as const,
      threshold: 100000,
      reward: 5000,
    },
  ];

  for (const b of badgesData) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: {
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        threshold: b.threshold,
        reward: b.reward,
      },
      create: b,
    });
  }
  console.log(`  🏅 ${badgesData.length} badges`);

  // ─── 10. Attribuer des badges aux utilisateurs ────────────────
  const now = Date.now();
  const userBadges = [
    {
      email: 'alice@test.com',
      codes: [
        'streak_3',
        'streak_7',
        'tasks_10',
        'tasks_50',
        'tasks_100',
        'referrals_3',
        'earnings_10000',
        'earnings_50000',
      ],
    },
    {
      email: 'bob@test.com',
      codes: ['streak_3', 'tasks_10', 'tasks_50', 'referrals_3', 'earnings_10000'],
    },
    { email: 'charlie@test.com', codes: ['streak_3', 'tasks_10'] },
    {
      email: 'fiona@test.com',
      codes: [
        'streak_3',
        'streak_7',
        'streak_30',
        'tasks_10',
        'tasks_50',
        'tasks_100',
        'referrals_3',
        'earnings_10000',
        'earnings_50000',
        'earnings_100000',
      ],
    },
  ];

  let ubCount = 0;
  for (const { email, codes } of userBadges) {
    const user = users.find((u) => u.email === email)!;
    for (const code of codes) {
      const badge = await prisma.badge.findUnique({ where: { code } });
      if (!badge) continue;
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
        update: {},
        create: { userId: user.id, badgeId: badge.id },
      });
      ubCount++;
    }
  }
  console.log(`  🎖️ ${ubCount} badges attribués`);

  // ─── 11. Device Fingerprints ──────────────────────────────────
  const fingerprints = [
    { email: 'alice@test.com', fingerprint: 'fp_alice_win_chrome_001', ip: '197.149.12.1' },
    { email: 'bob@test.com', fingerprint: 'fp_bob_android_firefox', ip: '154.120.85.3' },
    { email: 'charlie@test.com', fingerprint: 'fp_charlie_ios_safari', ip: '197.149.12.2' },
    { email: 'evan@test.com', fingerprint: 'fp_evan_win_edge_001', ip: '41.242.55.7' },
    { email: 'evan@test.com', fingerprint: 'fp_evan_android_chrome', ip: '41.242.55.7' },
  ];
  for (const f of fingerprints) {
    const user = users.find((u) => u.email === f.email)!;
    await prisma.deviceFingerprint.upsert({
      where: { userId_fingerprint: { userId: user.id, fingerprint: f.fingerprint } },
      update: { lastSeenAt: new Date() },
      create: {
        userId: user.id,
        fingerprint: f.fingerprint,
        ipAddress: f.ip,
        lastSeenAt: new Date(),
      },
    });
  }
  console.log(`  📱 ${fingerprints.length} empreintes digitales`);

  // ─── 12. Notifications ───────────────────────────────────────
  const notifTypes = ['WELCOME', 'TASK_COMPLETED', 'COMMISSION_RECEIVED', 'SYSTEM'] as const;
  for (let i = 0; i < 15; i++) {
    const user = users[i % 4];
    const type = notifTypes[i % notifTypes.length];
    const date = new Date(now - i * 86400000);
    await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title:
          type === 'WELCOME'
            ? 'Bienvenue sur XEARN !'
            : type === 'TASK_COMPLETED'
              ? 'Tâche complétée'
              : type === 'COMMISSION_RECEIVED'
                ? 'Commission reçue'
                : 'Information',
        message:
          type === 'WELCOME'
            ? 'Merci de rejoindre XEARN. Commencez à gagner dès maintenant !'
            : type === 'TASK_COMPLETED'
              ? 'Vous avez gagné 50 FCFA'
              : type === 'COMMISSION_RECEIVED'
                ? 'Votre filleul a complété une tâche. +10 FCFA'
                : 'Bienvenue dans votre nouveau tier !',
        read: i > 5,
        createdAt: date,
      },
    });
  }
  console.log(`  🔔 15 notifications`);

  // ─── 13. Advertisements (Pub Maker) ──────────────────────────
  const adsData = [
    {
      publisher: users[5],
      title: 'Promo MTN MoMo',
      status: 'ACTIVE' as const,
      budget: 50000,
      spent: 12500,
      targets: 'TG',
    },
    {
      publisher: users[5],
      title: 'Nouveau produit Togocom',
      status: 'ACTIVE' as const,
      budget: 75000,
      spent: 32000,
      targets: 'TG',
    },
    {
      publisher: users[5],
      title: 'Offre spéciale ORANGE',
      status: 'PAUSED' as const,
      budget: 30000,
      spent: 8000,
      targets: 'CI',
    },
  ];
  for (const ad of adsData) {
    await prisma.advertisement.create({
      data: {
        publisherId: ad.publisher.id,
        title: ad.title,
        description: 'Description test pour cette annonce',
        status: ad.status,
        budget: ad.budget,
        spent: ad.spent,
        targetCountries: [ad.targets],
        targetTiers: ['NORMAL', 'PREMIUM', 'VIP'],
      },
    });
  }
  console.log(`  📢 ${adsData.length} annonces Pub Maker`);

  // ─── 14. Commissions (références) ────────────────────────────
  const commissionData = [
    {
      beneficiary: users[0],
      source: users[1],
      level: 1,
      amount: 20,
      sourceType: 'TASK_COMPLETION',
    },
    { beneficiary: users[0], source: users[2], level: 2, amount: 5, sourceType: 'TASK_COMPLETION' },
    {
      beneficiary: users[1],
      source: users[3],
      level: 1,
      amount: 20,
      sourceType: 'TASK_COMPLETION',
    },
    {
      beneficiary: users[5],
      source: users[4],
      level: 1,
      amount: 20,
      sourceType: 'TASK_COMPLETION',
    },
  ];
  for (const c of commissionData) {
    await prisma.commission.create({
      data: {
        beneficiaryId: c.beneficiary.id,
        sourceUserId: c.source.id,
        level: c.level,
        percentage: c.level === 1 ? 40 : c.level === 2 ? 10 : 5,
        amount: c.amount,
        sourceType: c.sourceType,
      },
    });
  }
  console.log(`  💶 ${commissionData.length} commissions`);

  // ─── 15. Admin account (always) ──────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@xearn.local';
  const adminPass = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGEME_ON_DEPLOY', 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN', status: 'ACTIVATED', tier: 'VIP' },
    create: {
      email: adminEmail,
      password: adminPass,
      firstName: 'Admin',
      lastName: 'XEARN',
      role: 'ADMIN',
      status: 'ACTIVATED',
      tier: 'VIP',
      provider: 'LOCAL',
      emailVerifiedAt: new Date(),
      wallet: { create: { balance: 0, totalEarned: 0 } },
    },
  });
  console.log(`  👑 Admin: ${adminEmail}`);

  console.log('\n🎉 Seed terminé !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
