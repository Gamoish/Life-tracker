import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tracker.habits",
  appName: "Habits",
  // Capacitor's web view loads this folder straight off the device
  // filesystem — the output of `next build` in static-export mode.
  webDir: "out",
};

export default config;
