import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

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
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile) {
        try {
          const googleProfile = profile as any;
          const name = (googleProfile.name || '').trim();
          const nameParts = name.split(' ').filter(Boolean);
          const firstName = nameParts[0] || 'User';
          const lastName = nameParts.slice(1).join(' ') || 'Google';
          const email = googleProfile.email;
          const googleId = googleProfile.sub || googleProfile.id;

          if (!email || !googleId) return token;

          const res = await fetch(`${API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              googleId,
              firstName,
              lastName,
              avatarUrl: googleProfile.picture,
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
      (session as any).apiAccessToken = token.apiAccessToken;
      (session as any).apiRefreshToken = token.apiRefreshToken;
      (session as any).apiUser = token.apiUser;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
