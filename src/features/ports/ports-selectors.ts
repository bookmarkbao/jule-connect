import type { SidebarKey } from "@/components/app-sidebar";
import type { PortInfo, TunnelInfo } from "@/store/app-store";
import { detectProcessType } from "@/features/ports/process-type";

export function buildTunnelsByPort(tunnels: TunnelInfo[]) {
  const map = new Map<number, TunnelInfo>();
  for (const t of tunnels) map.set(t.port, t);
  return map;
}

export function portsWithPlaceholders(ports: PortInfo[], favorites: number[], watched: number[]) {
  const byPort = new Map<number, PortInfo>();
  for (const p of ports) byPort.set(p.port, p);

  const ensure = (port: number) => {
    if (byPort.has(port)) return;
    byPort.set(port, {
      port,
      pid: 0,
      protocol: "tcp",
      process_name: "Not running",
      address: "-",
      user: "-",
      fd: "-",
      command: "",
      is_active: false,
    });
  };

  for (const p of favorites) ensure(p);
  for (const p of watched) ensure(p);

  const out = [...byPort.values()];
  out.sort((a, b) => a.port - b.port);
  return out;
}

export function filterPorts(args: {
  ports: PortInfo[];
  sidebar: SidebarKey;
  favorites: number[];
  watched: number[];
  searchText: string;
  minPort: string;
  maxPort: string;
}) {
  let list = args.ports;
  const favoritesSet = new Set(args.favorites);
  const watchedSet = new Set(args.watched);

  if (args.sidebar === "favorites") {
    list = list.filter((p) => favoritesSet.has(p.port));
  } else if (args.sidebar === "watched") {
    list = list.filter((p) => watchedSet.has(p.port));
  } else if (args.sidebar.startsWith("type:")) {
    const type = args.sidebar.slice("type:".length);
    list = list.filter((p) => detectProcessType(p.process_name) === type);
  }

  const s = args.searchText.trim().toLowerCase();
  if (s) {
    list = list.filter((p) => {
      const hay = [
        String(p.port),
        p.process_name,
        p.address,
        p.user,
        p.protocol,
        p.command ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }

  const minPortNum = parsePortNumber(args.minPort);
  const maxPortNum = parsePortNumber(args.maxPort);
  if (minPortNum != null) list = list.filter((p) => p.port >= minPortNum);
  if (maxPortNum != null) list = list.filter((p) => p.port <= maxPortNum);
  return list;
}

export function computeCounts(ports: PortInfo[], favorites: number[], watched: number[], tunnels: TunnelInfo[]) {
  const byType = {
    webServer: 0,
    database: 0,
    development: 0,
    system: 0,
    other: 0,
  } as const;

  const nextByType: Record<keyof typeof byType, number> = { ...byType };
  for (const p of ports) {
    const t = detectProcessType(p.process_name);
    nextByType[t]++;
  }

  return {
    all: ports.length,
    favorites: favorites.length,
    watched: watched.length,
    tunnels: tunnels.length,
    byType: nextByType,
  };
}

function parsePortNumber(input: string) {
  if (!input.trim()) return null;
  const v = Number(input);
  if (!Number.isFinite(v)) return null;
  return v;
}
