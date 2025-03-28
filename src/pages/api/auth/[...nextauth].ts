import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/User';

const frontendUrl = 'https://surfapp2.vercel.app';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      await connectToDatabase();
      const existing = await User.findOne({ email: user.email });
      if (!existing) {
        await User.create({
          email: user.email,
          username: user.name,
          image: user.image,
        });
      }
      return true;
    },

    async session({ session }) {
      await connectToDatabase();
      const userInDb = await User.findOne({ email: session.user?.email });
      if (userInDb) {
        session.user._id = userInDb._id.toString();
        session.user.role = userInDb.role;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      return frontendUrl; // Always send user back to frontend after login/logout
    },
  },

  session: {
    strategy: 'jwt',
  },

  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: '__Host-next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
