// ============================================
// XEARN — Shared Domain Types (Mobile copy)
// ============================================

export type UserRole = 'USER' | 'PARTNER' | 'ADMIN';
export type AccountStatus = 'FREE' | 'ACTIVATED' | 'SUSPENDED' | 'BANNED';
export type AccountTier = 'NORMAL' | 'PREMIUM' | 'VIP';
export type AuthProvider = 'LOCAL' | 'GOOGLE';

export type TaskType = 'VIDEO_AD' | 'CLICK_AD' | 'SURVEY' | 'SPONSORED' | 'EXTERNAL';
export type TaskStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EXPIRED';

export type TransactionType =
  | 'ACTIVATION'
  | 'TASK_EARNING'
  | 'REFERRAL_L1'
  | 'REFERRAL_L2'
  | 'REFERRAL_L3'
  | 'WITHDRAWAL'
  | 'TIER_UPGRADE'
  | 'PUB_MAKER';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type PaymentMethod =
  | 'FLOOZ'
  | 'TMONEY'
  | 'MTN_MOMO'
  | 'ORANGE_MONEY'
  | 'VISA'
  | 'MASTERCARD'
  | 'PAYPAL';

export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type NotificationType =
  | 'WELCOME'
  | 'TASK_COMPLETED'
  | 'COMMISSION_RECEIVED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'ACCOUNT_ACTIVATED'
  | 'NEW_REFERRAL'
  | 'SYSTEM';

export type AdStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'REJECTED';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
  tier: AccountTier;
  referralCode: string;
  avatarUrl: string | null;
  provider: AuthProvider;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  referralCode?: string;
  fingerprint?: string;
}

export interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
  fingerprint?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  message?: string;
  requiresEmailVerification?: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  verificationUrl?: string;
}

export interface MessageResponse {
  message: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: string;
  totalEarned: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: string;
  method: PaymentMethod;
  status: WithdrawalStatus;
  accountInfo: string;
  processedAt: string | null;
  createdAt: string;
}

export interface WithdrawPayload {
  amount: number;
  method: PaymentMethod;
  accountInfo: string;
}

export interface WalletOverview {
  wallet: Wallet;
  recentTransactions: Transaction[];
}

export interface WalletData {
  wallet: Wallet;
  recentWithdrawals: Withdrawal[];
  fees: FeesInfo;
}

export interface DashboardData {
  user: User;
  wallet: Wallet;
  stats: {
    totalEarned: string;
    todayEarnings: string;
    pendingWithdrawals: number;
    activeReferrals: number;
  };
  recentTasks: TaskCompletion[];
}

export interface FeesInfo {
  withdrawalFeePercent: number;
  minimumWithdrawal: number;
}

export interface TierPricing {
  tier: AccountTier;
  price: number;
  label: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  type: TaskType;
  status: TaskStatus;
  reward: string;
  mediaUrl: string | null;
  externalUrl: string | null;
  referralLink: string | null;
  instructions: string | null;
  requiredTier: AccountTier;
  maxCompletions: number | null;
  completionCount: number;
  expiresAt: string | null;
  requiresCode: boolean;
  createdAt: string;
}

export interface TaskSession {
  sessionId: string;
  startedAt: string;
  minDurationSeconds: number;
  verificationCode?: string | null;
  codeGeneratedAt?: string | null;
  codeViewedAt?: string | null;
  task: {
    id: string;
    title: string;
    type: TaskType;
    description: string | null;
    mediaUrl: string | null;
    externalUrl: string | null;
    reward: string;
    requiresCode?: boolean;
  };
}

export interface TaskLandingPageData {
  task: {
    id: string;
    title: string;
    description: string | null;
    instructions: string | null;
    reward: number;
    externalUrl: string | null;
    requiresCode: boolean;
  };
  session: {
    verificationCode: string;
    startedAt: string;
    codeGeneratedAt: string | null;
    minDurationSeconds?: number;
  };
}

export interface TaskCompletion {
  id: string;
  userId: string;
  taskId: string;
  earned: string;
  createdAt: string;
  task?: Task;
}

export interface TasksPage {
  tasks: Task[];
  total: number;
  page: number;
  pages: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface ReferralUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  tier: AccountTier;
  status: AccountStatus;
  createdAt: string;
}

export interface ReferralTree {
  level1: ReferralUser[];
  level2: ReferralUser[];
  level3: ReferralUser[];
}

export interface Commission {
  id: string;
  beneficiaryId: string;
  sourceUserId: string;
  sourceUser?: { firstName: string; lastName: string; email?: string };
  level: number;
  percentage: string;
  amount: string;
  createdAt: string;
}

export interface ReferralStats {
  totalLevel1: number;
  totalLevel2: number;
  totalLevel3: number;
  totalCommissions: string;
  commissionsL1: string;
  commissionsL2: string;
  commissionsL3: string;
  l1Percent: number;
  l2Percent: number;
  l3Percent: number;
  userTier: AccountTier;
  l3Active: boolean;
}

export interface ReferralTreeData {
  level1: ReferralUser[];
  level2: ReferralUser[];
  level3: ReferralUser[];
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalCommissions: string;
  };
}

export interface Advertisement {
  id: string;
  publisherId: string;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  targetUrl: string | null;
  status: AdStatus;
  targetCountries: string[];
  targetTiers: AccountTier[];
  budget: string | null;
  spent: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdPayload {
  title: string;
  description?: string;
  mediaUrl?: string;
  targetUrl?: string;
  expiresAt?: string;
  targetCountries?: string[];
  targetTiers?: AccountTier[];
  budget?: number;
}

export interface UpdateAdPayload extends Partial<CreateAdPayload> {
  status?: AdStatus;
}

export interface AdsPage {
  ads: Advertisement[];
  total: number;
  page: number;
  pages: number;
}

export interface AdStats {
  totalAds: number;
  activeAds: number;
  totalSpent: string;
  totalBudget: string;
  ads: Array<Advertisement & { impressions: number; clicks: number }>;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export type BadgeCategory = 'STREAK' | 'TASKS' | 'REFERRALS' | 'EARNINGS';

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  threshold: number;
  reward: string | null;
  earned: boolean;
  earnedAt: string | null;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

export interface LeaderboardEntry {
  id: string;
  currentStreak: number;
  longestStreak: number;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'tier'>;
}

export interface CompleteTaskPayload {
  verificationCode?: string;
}
