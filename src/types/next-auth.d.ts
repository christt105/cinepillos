import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            activeFamilyId?: string | null;
            activeFamily?: { id: string; name: string } | null;
            families: { id: string; name: string }[];
            isAdmin?: boolean;
        } & DefaultSession["user"]
    }
}
