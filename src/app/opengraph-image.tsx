import { ImageResponse } from "next/og";
import en from "../../messages/en.json";

// The OG renderer has no Bengali font loaded, so the share image uses the
// English copy from the message file.
export const alt = en.meta.defaultTitle;
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
          {en.og.mark}
        </div>
        {en.meta.siteName}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -2 }}>{en.og.title}</div>
        <div style={{ fontSize: 30, color: "#c7d2fe" }}>{en.og.subtitle}</div>
      </div>
    </div>,
    size,
  );
}
