export type ProcessType = "webServer" | "database" | "development" | "system" | "other";

export function detectProcessType(processName: string): ProcessType {
  const n = processName.toLowerCase();
  if (
    n.includes("node") ||
    n.includes("vite") ||
    n.includes("next") ||
    n.includes("nginx") ||
    n.includes("apache") ||
    n.includes("caddy") ||
    n.includes("http")
  ) {
    return "webServer";
  }
  if (
    n.includes("postgres") ||
    n.includes("postmaster") ||
    n.includes("mysql") ||
    n.includes("mongod") ||
    n.includes("redis") ||
    n.includes("memcached")
  ) {
    return "database";
  }
  if (n.includes("cargo") || n.includes("rust") || n.includes("python") || n.includes("java")) {
    return "development";
  }
  if (n.includes("launchd") || n.includes("system") || n.includes("svchost")) {
    return "system";
  }
  return "other";
}

export function processTypeLabel(t: ProcessType) {
  switch (t) {
    case "webServer":
      return "Web Server";
    case "database":
      return "Database";
    case "development":
      return "Development";
    case "system":
      return "System";
    case "other":
      return "Other";
  }
}

