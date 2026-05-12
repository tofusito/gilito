import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32, height: 32,
        borderRadius: 8,
        background: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 20, height: 20,
          borderRadius: 10,
          background: "#e8a020",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 14, height: 14,
            borderRadius: 7,
            background: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e8a020",
            fontSize: 9,
            fontWeight: 300,
            fontFamily: "serif",
          }}
        >
          €
        </div>
      </div>
    </div>,
    { ...size }
  );
}
