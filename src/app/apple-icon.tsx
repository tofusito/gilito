import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180, height: 180,
        borderRadius: 40,
        background: "linear-gradient(145deg, #f0a820 0%, #c87d10 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        gap: 4,
      }}
    >
      {/* Moneda */}
      <div
        style={{
          width: 96, height: 96,
          borderRadius: 48,
          background: "rgba(255,255,255,0.18)",
          border: "4px solid rgba(255,255,255,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 54,
          fontWeight: 900,
          color: "white",
          letterSpacing: -2,
        }}
      >
        €
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: 1,
          marginTop: 4,
        }}
      >
        GILITO
      </div>
    </div>,
    { ...size }
  );
}
