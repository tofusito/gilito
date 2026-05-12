import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gilito",
    short_name: "Gilito",
    description: "Tu colección de monedas euro",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#e8a020",
    orientation: "portrait",
    icons: [
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon.png",       sizes: "32x32",   type: "image/png" },
    ],
  };
}
