import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180, height: 180,
        background: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Anillo exterior */}
      <div
        style={{
          width: 116, height: 116,
          borderRadius: 58,
          background: "#e8a020",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Anillo interior */}
        <div
          style={{
            width: 88, height: 88,
            borderRadius: 44,
            background: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e8a020",
            fontSize: 46,
            fontWeight: 300,
            fontFamily: "serif",
            letterSpacing: -1,
          }}
        >
          €
        </div>
      </div>
    </div>,
    { ...size }
  );
}
