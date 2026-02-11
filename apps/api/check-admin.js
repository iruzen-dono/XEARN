const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({
  datasources: { db: { url: 'postgresql://xearn:xearn_password@localhost:5432/xearn_db?schema=public' } }
});

async function main() {
  // 1. Get admin referral code
  const admin = await p.user.findUnique({
    where: { email: 'juleszhou00@gmail.com' },
    select: { id: true, referralCode: true, status: true, role: true }
  });
  console.log('=== Admin ===');
  console.log(JSON.stringify(admin, null, 2));

  // 2. Check referrals (users referred by admin)
  const referrals = await p.user.findMany({
    where: { referredById: admin.id },
    select: { id: true, firstName: true, lastName: true, email: true, status: true, referralCode: true }
  });
  console.log('\n=== Filleuls Admin ===');
  console.log(JSON.stringify(referrals, null, 2));

  // 3. Check commissions
  const commissions = await p.commission.findMany({
    where: { beneficiaryId: admin.id },
    select: { id: true, amount: true, level: true, sourceUserId: true }
  });
  console.log('\n=== Commissions Admin ===');
  console.log(JSON.stringify(commissions, null, 2));

  // 4. Count all users and list them
  const allUsers = await p.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, status: true, referredById: true, referralCode: true, provider: true }
  });
  console.log('\n=== Tous les utilisateurs ===');
  console.log(JSON.stringify(allUsers, null, 2));

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
