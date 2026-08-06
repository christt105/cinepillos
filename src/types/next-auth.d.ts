import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            activeGroupId?: string | null;
            activeGroup?: { id: string; name: string } | null;
            groups: { id: string; name: string }[];
            isAdmin?: boolean;
        } & DefaultSession["user"]
    }
}
