import type { Session } from "next-auth";
import type { User } from "@prisma/client";

let current: Session | null = null;

/** Reads the session the `next-auth` mock should answer with. */
export function getSession(): Session | null {
    return current;
}

export function signIn(user: User): void {
    current = {
        user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin },
        expires: new Date(Date.now() + 86400000).toISOString(),
    } as Session;
}

export function signOut(): void {
    current = null;
}
