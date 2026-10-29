import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forwards API calls to the Express server during development so the
    // client can call relative paths like "/tickets" without a CORS round trip
    // or an env-configured base URL. In production the built client is
    // served by that same Express server, so the paths already resolve.
    proxy: {
      "/tickets": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
