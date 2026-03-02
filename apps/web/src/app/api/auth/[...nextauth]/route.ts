import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';

// Extend NextAuth types to include our custom fields
declare module 'next-auth' {
  interface Session {
    apiAccessToken?: string;
    apiRefreshToken?: string;
    apiUser?: Record<string, unknown>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    apiAccessToken?: string;
    apiRefreshToken?: string;
    apiUser?: Record<string, unknown>;
  }
}

// Server-side route handler: API_URL must use env directly (no client-side import)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === 'google' && account.id_token) {
        try {
          // Read the referral code cookie set before the OAuth redirect
          const cookieStore = await cookies();
          const referralCode = cookieStore.get('xearn_referral')?.value || undefined;

          // Send the Google id_token for server-side verification
          // The backend verifies the token cryptographically with google-auth-library
          // instead of trusting frontend-provided profile fields
          const res = await fetch(`${API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken: account.id_token,
              ...(referralCode ? { referralCode } : {}),
            }),
          });

          if (res.ok) {
            const data = await res.json();
            token.apiAccessToken = data.accessToken;
            token.apiRefreshToken = data.refreshToken;
            token.apiUser = data.user;
          }
        } catch {
          // API unavailable — token returned without API data
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.apiAccessToken = token.apiAccessToken as string | undefined;
      session.apiRefreshToken = token.apiRefreshToken as string | undefined;
      session.apiUser = token.apiUser as Record<string, unknown> | undefined;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
