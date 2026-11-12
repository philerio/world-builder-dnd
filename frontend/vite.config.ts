import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const networkInfoPlugin: Plugin = {
  name: "world-builder-network-info",
  configureServer(server) {
    server.middlewares.use("/__world-builder/network", (_request, response) => {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(server.resolvedUrls?.network ?? []));
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), networkInfoPlugin],
  server: {
    // The normal start.sh / npm run dev path must also support phones on the LAN.
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
  },
});
