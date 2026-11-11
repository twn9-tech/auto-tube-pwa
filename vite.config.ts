import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;
const clientRoot = path.resolve(root, "client");

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/auto-tube-pwa/" : "/",
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(clientRoot, "src") } },
  root: clientRoot,
  publicDir: path.resolve(clientRoot, "public"),
  build: { outDir: path.resolve(root, "dist"), emptyOutDir: true },
});
