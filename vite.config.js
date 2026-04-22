import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    root: path.resolve(process.cwd(), "client"), // ✅ Points Vite to your client folder
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(process.cwd(), "client", "src"),
            "@shared": path.resolve(process.cwd(), "shared"),
            "@assets": path.resolve(process.cwd(), "attached_assets"),
            // ✅ Ensures react-hook-form uses a compatible build
            "react-hook-form": path.resolve(process.cwd(), "node_modules", "react-hook-form", "dist", "index.cjs.js"),
            // Some Radix packages publish `exports` pointing to an `.mjs` entry
            // that may be missing in some installs. Point Vite at the actual
            // built file to avoid "Failed to resolve entry" during pre-bundle.
            "@radix-ui/react-popper": path.resolve(process.cwd(), "node_modules", "@radix-ui", "react-popper", "dist", "index.js"),
        },
    },
    define: {
        global: "globalThis",
    },
    optimizeDeps: {
        include: ["buffer"],
    },
    build: {
        outDir: path.resolve(process.cwd(), "dist/public"), // ✅ Output goes here
        emptyOutDir: true, // Cleans dist before build
        rollupOptions: {
            plugins: [
                {
                    name: "buffer-polyfill",
                    resolveId(id) {
                        if (id === "buffer") {
                            return { id: "buffer", external: false };
                        }
                    },
                    load(id) {
                        if (id === "buffer") {
                            return "export default Buffer;";
                        }
                    },
                },
            ],
        },
    },
    server: {
        host: "0.0.0.0",
        port: 5000,
        strictPort: false,
        hmr: {
            clientPort: 443,
        },
        allowedHosts: true,
        fs: {
            strict: true,
            deny: ["**/.*"],
        },
    },
});
