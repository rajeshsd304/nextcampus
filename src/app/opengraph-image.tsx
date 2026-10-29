import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: "white",
        background: "radial-gradient(circle at 20% 0%, #4f46e5 0%, #1f2d59 45%, #060b1d 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 700 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "linear-gradient(135deg, #6366f1, #1f2d59)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
          }}
        >
          N
        </div>
        NextCampus
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
          Secure, trusted, modern digital assessments.
        </div>
        <div style={{ fontSize: 30, color: "#c7d2fe" }}>
          For universities, coaching centers, training organizations and instructors.
        </div>
      </div>
    </div>,
    size,
  );
}
