import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react()],
  // the Android emulator reaches the host as 10.0.2.2
  preview: { host: "0.0.0.0", port: 8000, allowedHosts: true },
});
