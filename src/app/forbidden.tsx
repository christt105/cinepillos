import Link from "next/link";

export default function Forbidden() {
    return (
        <div className="glass-card notice">
            <h2 className="notice-title">Este grupo no es tuyo</h2>
            <p className="notice-text">
                No perteneces a este grupo de cine. Pide a alguien del grupo que te añada.
            </p>
            <Link href="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
    );
}
