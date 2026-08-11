import { NextAuthOptions } from "next-auth";
import GoogleProvider, { GoogleProfile } from "next-auth/providers/google";
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
            // Whatever this returns is what `PrismaAdapter.createUser` writes
            // to the User row, and the default mapping includes Google's
            // `picture`. Anyone who signs in without having been
            // pre-provisioned goes through that path, so the default would
            // store their Google photo — which /privacy promises we never do.
            // Avatars only ever come from the picker in
            // `/api/users/[id]/avatar`.
            profile: (profile: GoogleProfile) => ({
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: null,
            }),
        }),
    ],
    callbacks: {
        session: async ({ session, token }) => {
            if (token.id) {
                // Runs on every request under the jwt strategy, so this pulls only the
                // columns the session actually needs (not the full User/Group rows),
                // and derives activeGroup from `memberships` instead of a second
                // relational fetch — activeGroupId always points at a group the user
                // is already a member of, see rememberLastGroup/requireGroupMember.
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: {
                        isAdmin: true,
                        activeGroupId: true,
                        memberships: {
                            select: { group: { select: { id: true, name: true } } },
                        },
                    },
                });

                const groups = dbUser?.memberships.map(m => m.group) ?? [];
                const activeGroup = groups.find(g => g.id === dbUser?.activeGroupId) ?? null;

                return {
                    ...session,
                    user: {
                        ...session.user,
                        id: token.id,
                        activeGroupId: dbUser?.activeGroupId,
                        activeGroup,
                        groups,
                        isAdmin: dbUser?.isAdmin || false
                    },
                };
            }
            return session;
        },
        jwt: async ({ token, user }) => {
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
