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
    <div className="glass-card notice">
      <h2 className="notice-title">¡Bienvenido!</h2>
      <p className="notice-text">No tienes ningún grupo de cine activo.</p>
      <p className="notice-text">Pide a un administrador que te añada a uno.</p>
    </div>
  );
}
