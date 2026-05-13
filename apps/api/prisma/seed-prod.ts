import { PrismaClient, UserRole, AccountTier, AccountStatus, AuthProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Usage: ADMIN_SEED_PASSWORD="..." ADMIN_EMAIL="admin@xearn.com" npx ts-node prisma/seed-prod.ts

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@xearn.com';

  if (!adminPassword) {
    throw new Error('ADMIN_SEED_PASSWORD environment variable is required');
  }

  if (adminPassword.length < 12) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 12 characters long');
  }

  console.log(`Creating admin account: ${adminEmail}`);

  const hash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hash,
      firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
      lastName: process.env.ADMIN_LAST_NAME || 'XEARN',
      role: UserRole.ADMIN,
      tier: AccountTier.VIP,
      status: AccountStatus.ACTIVATED,
      provider: AuthProvider.LOCAL,
      emailVerifiedAt: new Date(),
      referralCode: 'ADMIN0000',
      wallet: {
        create: { balance: 0, totalEarned: 0 },
      },
    },
  });

  console.log(`Admin created: ${admin.email} (${admin.id}), role=${admin.role}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
