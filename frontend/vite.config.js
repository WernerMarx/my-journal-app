import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Forward all /api and /auth requests to Django in development.
      "/api": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
