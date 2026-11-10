import { ImageResponse } from "next/og";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#314e3e",
        color: "#f4efd9",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 235,
          height: 300,
          borderRadius: "95% 0 95% 0",
          background: "#d5dfb3",
          transform: "rotate(6deg)",
        }}
      />
    </div>,
    size,
  );
}
