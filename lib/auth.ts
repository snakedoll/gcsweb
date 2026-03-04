import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import KakaoProvider from 'next-auth/providers/kakao';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';

function mapMemberTypeToRole(memberType: number) {
  return memberType === 2 ? 'admin' : 'user';
}

function normalizeNicknameBase(email: string) {
  const local = email.split('@')[0] ?? 'user';
  const cleaned = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
  return cleaned.length >= 2 ? cleaned : `user${cleaned}`;
}

async function createUniqueNickname(email: string) {
  const base = normalizeNicknameBase(email);
  const candidates = [base, ...Array.from({ length: 9 }, (_, i) => `${base}${String(i + 1).padStart(4, '0')}`)];

  for (const nick of candidates) {
    const exists = await prisma.user.findUnique({ where: { nickname: nick }, select: { id: true } });
    if (!exists) return nick;
  }

  return `${base}${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: { email: credentials.email, signupMethod: 'EMAIL' },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: mapMemberTypeToRole(user.memberType),
        };
      },
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID ?? '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'profile_nickname account_email',
        },
      },
      profile(profile) {
        const anyProfile = profile as any;
        const email =
          anyProfile?.kakao_account?.email ??
          anyProfile?.kakao_account?.account_email ??
          anyProfile?.email ??
          null;
        const nickname =
          anyProfile?.properties?.nickname ??
          anyProfile?.kakao_account?.profile?.nickname ??
          anyProfile?.profile?.nickname ??
          null;

        return {
          id: String(anyProfile?.id ?? ''),
          name: nickname ?? 'Kakao User',
          email: email,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'kakao') return true;

      const email = user.email;
      if (!email) {
        // Kakao accounts may not provide email unless scope is granted.
        return false;
      }

      const existing = await prisma.user.findFirst({
        where: { email },
        select: { id: true, signupMethod: true },
      });

      if (existing) {
        if (existing.signupMethod === 'EMAIL') {
          return false; // This redirects to /login?error=AccessDenied
        }
        return true;
      }

      const nickname = await createUniqueNickname(email);
      const name = user.name ?? 'Kakao User';

      await prisma.user.create({
        data: {
          email,
          password: null,
          phone: null,
          nickname,
          name,
          isVerified: true,
          signupMethod: 'KAKAO',
        },
        select: { id: true },
      });

      return true;
    },

    async jwt({ token, user, account }) {
      // Credentials login sets id/role directly (from authorize()).
      if (account?.provider === 'credentials' && user) {
        if (user.id) token.id = user.id;
        if (user.role) token.role = user.role;
        return token;
      }

      // For OAuth logins (e.g. Kakao), or when token is missing app-specific fields,
      // hydrate token.id/role from our User table.
      if (token.email && (!token.id || !token.role || account?.provider === 'kakao')) {
        const dbUser = await prisma.user.findFirst({
          where: { email: token.email as string },
          select: { id: true, memberType: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = mapMemberTypeToRole(dbUser.memberType);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
