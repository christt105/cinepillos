import Link from "next/link";

export default function Forbidden() {
    return (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center", maxWidth: "600px", margin: "3rem auto" }}>
            <h2 style={{ marginBottom: "1rem" }}>Este grupo no es tuyo</h2>
            <p style={{ opacity: 0.8, marginBottom: "2rem" }}>
                No perteneces a este grupo de cine. Pide a alguien del grupo que te añada.
            </p>
            <Link href="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
    );
}
