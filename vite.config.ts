import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Plugin } from "vite";

// A CSP do index.html só libera *.supabase.co (produção). No modo dev,
// libera também o stack local do Supabase CLI, sem afrouxar o build final.
const allowLocalSupabaseInDev = (): Plugin => ({
  name: "allow-local-supabase-in-dev",
  apply: "serve",
  transformIndexHtml: (html) =>
    html.replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:54321 ws://127.0.0.1:54321"),
});

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), allowLocalSupabaseInDev()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
  },
});
