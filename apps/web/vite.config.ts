import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [react()],
  // old Android WebViews (Chrome 74-era, see docs/design.md appendix) must run the bundle
  build: { target: ["chrome70", "safari13"] },
  // the Android emulator reaches the host as 10.0.2.2
  preview: { host: "0.0.0.0", port: 8000, allowedHosts: true },
});
