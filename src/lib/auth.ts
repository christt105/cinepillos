import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                identifier: { label: "Email o nombre", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.identifier || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: credentials.identifier },
                            { name: credentials.identifier },
                        ],
                    },
                });

                if (!user || !user.password) {
                    return null;
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
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
