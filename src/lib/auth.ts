import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            // Users are pre-provisioned by an admin from /admin with just a
            // name and email, before they have ever signed in. Without this,
            // their first Google sign-in throws OAuthAccountNotLinked instead
            // of linking to that existing User. Safe because Google verifies
            // the email itself.
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    callbacks: {
        session: async ({ session, token }) => {
            if (token.id) {
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    include: { memberships: { include: { group: true } }, activeGroup: true }
                });

                return {
                    ...session,
                    user: {
                        ...session.user,
                        id: token.id,
                        activeGroupId: dbUser?.activeGroupId,
                        activeGroup: dbUser?.activeGroup,
                        groups: dbUser?.memberships.map(m => m.group) || [],
                        isAdmin: dbUser?.isAdmin || false
                    },
                };
            }
            return session;
        },
        jwt: ({ token, user }) => {
            if (user) {
                return {
                    ...token,
                    id: user.id,
                };
            }
            return token;
        },
    },
};
