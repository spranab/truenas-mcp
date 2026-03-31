#!/usr/bin/env node

import { startStdio } from "./index.js";

const baseUrl = process.env.TRUENAS_URL || process.env.TRUENAS_HOST;
const apiKey = process.env.TRUENAS_API_KEY;

if (!baseUrl) {
  console.error(
    "Error: TRUENAS_URL environment variable is required.\n" +
      "Set it to your TrueNAS instance URL, e.g.:\n" +
      "  export TRUENAS_URL=https://truenas.local\n" +
      "  export TRUENAS_API_KEY=1-abc123...\n"
  );
  process.exit(1);
}

if (!apiKey) {
  console.error(
    "Error: TRUENAS_API_KEY environment variable is required.\n" +
      "Generate an API key in TrueNAS UI: Settings → API Keys → Add\n"
  );
  process.exit(1);
}

const verifySsl = process.env.TRUENAS_VERIFY_SSL !== "false";

startStdio({ baseUrl, apiKey, verifySsl }).catch((err) => {
  console.error("Failed to start TrueNAS MCP server:", err);
  process.exit(1);
});
