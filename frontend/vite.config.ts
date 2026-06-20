import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "esnext",
    minify: "esbuild", // Default engine uses built-in esbuild (Zero install needed, extremely fast)
    cssCodeSplit: true, // Splits your Tailwind CSS per component to reduce initial load time
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("d3")) {
              return "vendor-charts"; // Separates heavy charting code
            }
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-core"; // Bundles core React library together
            }
            return "vendor-utils"; // Packs remaining smaller utilities
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://carbon-footprint-tracker-lzgo.onrender.com",
        changeOrigin: true,
      },
    },
  },
});
