import { redirect } from "next/navigation";
import { resolveLandingGroupId } from "@/lib/group-page";

// Force dynamic to ensure we check session
export const dynamic = "force-dynamic";

export default async function Home() {
  const groupId = await resolveLandingGroupId();

  if (groupId) {
    redirect(`/g/${groupId}`);
  }

  return (
    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
      <h2>¡Bienvenido!</h2>
      <p style={{ opacity: 0.8, marginTop: '1rem' }}>No tienes ningún grupo de cine activo.</p>
      <p style={{ opacity: 0.8 }}>Pide a un administrador que te añada a uno.</p>
    </div>
  );
}
