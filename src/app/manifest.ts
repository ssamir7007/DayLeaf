import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dayleaf Habit Journal",
    short_name: "Dayleaf",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f0",
    theme_color: "#314e3e",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
