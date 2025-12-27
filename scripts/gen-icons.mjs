import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function usage(exitCode = 0) {
  const msg = `
Generate Tauri app icons into src-tauri/icons.

Usage:
  node scripts/gen-icons.mjs [--input <path>] [--output <dir>]
  node scripts/gen-icons.mjs <input>

Defaults:
  --input  src-tauri/app-icon.png
  --output src-tauri/icons

Notes:
  - Input should be a square PNG or SVG (transparent background recommended).
  - Uses the local Tauri CLI (node_modules/.bin/tauri).
`;
  // eslint-disable-next-line no-console
  console.log(msg.trim());
  process.exit(exitCode);
}

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) usage(0);

let input;
let output;

for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--input" || a === "-i") {
    input = args[i + 1];
    i += 1;
    continue;
  }
  if (a === "--output" || a === "-o") {
    output = args[i + 1];
    i += 1;
    continue;
  }
  if (!a.startsWith("-") && !input) {
    input = a;
    continue;
  }
  // eslint-disable-next-line no-console
  console.error(`Unknown argument: ${a}`);
  usage(2);
}

input ??= "src-tauri/app-icon.png";
output ??= "src-tauri/icons";

if (!existsSync(input)) {
  // eslint-disable-next-line no-console
  console.error(`Input not found: ${input}`);
  process.exit(1);
}

const tauriBin = path.join(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tauri.cmd" : "tauri"
);

if (!existsSync(tauriBin)) {
  // eslint-disable-next-line no-console
  console.error(`Tauri CLI not found at ${tauriBin}. Run \`npm i\` first.`);
  process.exit(1);
}

const result = spawnSync(tauriBin, ["icon", input, "--output", output], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);

