import { prisma } from "@/lib/prisma";
import { ProfileSelector } from "./ProfileSelector";

// Server Component to fetch users
export const dynamic = "force-dynamic";

export default async function LoginPage() {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, image: true, email: true }
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#141414' }}>
            <h1 style={{ fontSize: '3.5vw', fontWeight: '400', marginBottom: '2rem', color: '#fff' }}>Who's watching?</h1>
            <ProfileSelector users={users} />
        </div>
    );
}
