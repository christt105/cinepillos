import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";

export const dynamic = "force-static";

/**
 * Brand card used as `og:image` by every route without an image of its own.
 * Rendered as a real PNG because WhatsApp and Discord ignore SVG previews.
 */
export function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #0b0b12 0%, #241033 60%, #3b1250 100%)",
                    color: "#f5f3ff",
                    fontSize: 48,
                }}
            >
                <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: -2 }}>{SITE_NAME}</div>
                <div style={{ marginTop: 24, fontSize: 40, opacity: 0.75 }}>{SITE_DESCRIPTION}</div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
