import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function usage(exitCode = 0) {
  // eslint-disable-next-line no-console
  console.log(
    `
Release helper: bump version, commit, tag, and push (to trigger CI packaging).

Usage:
  yarn release v1.0.2
  yarn release 1.0.2
  yarn release --bump patch|minor|major

Options:
  --bump <type>     Bump from current version (default: patch)
  --remote <name>   Git remote (default: origin)
  --no-push         Create commit+tag but do not push
  --dry-run         Print actions without changing files/git

Notes:
  - Updates versions in:
    - package.json
    - src-tauri/tauri.conf.json
    - src-tauri/Cargo.toml
  - Creates annotated tag: vX.Y.Z
`.trim()
  );
  process.exit(exitCode);
}

function sh(command, { dryRun = false } = {}) {
  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`[dry-run] ${command}`);
    return "";
  }
  return execSync(command, { stdio: ["ignore", "pipe", "inherit"] })
    .toString()
    .trim();
}

function isCleanGitTree() {
  const out = execSync("git status --porcelain=v1", {
    stdio: ["ignore", "pipe", "inherit"],
  })
    .toString()
    .trim();
  return out.length === 0;
}

function normalizeVersion(input) {
  const v = input.startsWith("v") ? input.slice(1) : input;
  if (!/^\d+\.\d+\.\d+$/.test(v)) {
    throw new Error(`Invalid version: ${input} (expected X.Y.Z)`);
  }
  return v;
}

function bump(version, bumpType) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid version: ${version}`);
  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (bumpType === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === "minor") {
    minor += 1;
    patch = 0;
  } else if (bumpType === "patch") {
    patch += 1;
  } else {
    throw new Error(`Invalid bump type: ${bumpType}`);
  }

  return `${major}.${minor}.${patch}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function updateCargoTomlVersion(tomlText, nextVersion) {
  const lines = tomlText.split(/\r?\n/);
  const packageIndex = lines.findIndex((line) => line.trim() === "[package]");
  if (packageIndex === -1) throw new Error("Cargo.toml missing [package]");

  const nextSectionIndex = lines
    .slice(packageIndex + 1)
    .findIndex((line) => /^\s*\[.+\]\s*$/.test(line));
  const packageEnd =
    nextSectionIndex === -1 ? lines.length : packageIndex + 1 + nextSectionIndex;

  const versionIndex = lines
    .slice(packageIndex + 1, packageEnd)
    .findIndex((line) => /^\s*version\s*=\s*".*"\s*$/.test(line));
  if (versionIndex === -1) throw new Error("Cargo.toml missing package version");

  const absoluteVersionIndex = packageIndex + 1 + versionIndex;
  lines[absoluteVersionIndex] = `version = "${nextVersion}"`;
  return `${lines.join("\n")}\n`;
}

const args = process.argv.slice(2);
if (args.includes("-h") || args.includes("--help")) usage(0);

let explicitVersion;
let bumpType;
let remote = "origin";
let noPush = false;
let dryRun = false;

for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--bump") {
    bumpType = args[i + 1];
    i += 1;
    continue;
  }
  if (a === "--remote") {
    remote = args[i + 1];
    i += 1;
    continue;
  }
  if (a === "--no-push") {
    noPush = true;
    continue;
  }
  if (a === "--dry-run") {
    dryRun = true;
    continue;
  }
  if (!a.startsWith("-") && !explicitVersion) {
    explicitVersion = a;
    continue;
  }
  // eslint-disable-next-line no-console
  console.error(`Unknown argument: ${a}`);
  usage(2);
}

if (!dryRun && !isCleanGitTree()) {
  // eslint-disable-next-line no-console
  console.error(
    "Working tree is not clean. Commit/stash your changes before releasing."
  );
  process.exit(1);
}

const packageJsonPath = "package.json";
const tauriConfPath = "src-tauri/tauri.conf.json";
const cargoTomlPath = "src-tauri/Cargo.toml";

const pkg = readJson(packageJsonPath);
const tauriConf = readJson(tauriConfPath);

const currentVersion =
  pkg.version ?? tauriConf.version ?? (() => {
    throw new Error("Cannot find current version in package.json or tauri.conf.json");
  })();

const nextVersion = explicitVersion
  ? normalizeVersion(explicitVersion)
  : bump(normalizeVersion(String(currentVersion)), bumpType ?? "patch");

const tag = `v${nextVersion}`;

// eslint-disable-next-line no-console
console.log(`Releasing ${tag}`);

pkg.version = nextVersion;
tauriConf.version = nextVersion;

if (dryRun) {
  // eslint-disable-next-line no-console
  console.log(`[dry-run] write ${packageJsonPath} version=${nextVersion}`);
  // eslint-disable-next-line no-console
  console.log(`[dry-run] write ${tauriConfPath} version=${nextVersion}`);
} else {
  writeJson(packageJsonPath, pkg);
  writeJson(tauriConfPath, tauriConf);
}

const cargoToml = readFileSync(cargoTomlPath, "utf8");
const nextCargoToml = updateCargoTomlVersion(cargoToml, nextVersion);
if (dryRun) {
  // eslint-disable-next-line no-console
  console.log(`[dry-run] write ${cargoTomlPath} version=${nextVersion}`);
} else {
  writeFileSync(cargoTomlPath, nextCargoToml);
}

sh(`git add ${packageJsonPath} ${tauriConfPath} ${cargoTomlPath}`, { dryRun });
sh(`git commit -m "release: ${tag}"`, { dryRun });
sh(`git tag -a ${tag} -m "release ${tag}"`, { dryRun });

if (!noPush) {
  sh(`git push ${remote} HEAD`, { dryRun });
  sh(`git push ${remote} ${tag}`, { dryRun });
}
