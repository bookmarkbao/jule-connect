import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SidebarKey } from "@/components/app-sidebar";

export type PortInfo = {
  port: number;
  pid: number;
  protocol: string;
  process_name: string;
  address: string;
  user: string;
  fd: string;
  command?: string | null;
  is_active: boolean;
};

export type TunnelInfo = {
  port: number;
  provider: string;
  url: string;
  started_at_ms: number;
  last_renewed_at_ms: number;
};

export type SortKey = "actions" | "active" | "port" | "process" | "pid" | "type" | "address" | "user";

type State = {
  ports: PortInfo[];
  tunnels: TunnelInfo[];
  busyPorts: Record<number, boolean>;
  error: string | null;

  sidebar: SidebarKey;
  selectedPort: number | null;

  searchText: string;
  minPort: string;
  maxPort: string;

  favorites: number[];
  watched: number[];

  sortKey: SortKey;
  sortAsc: boolean;
};

type Actions = {
  setSidebar: (value: SidebarKey) => void;
  setSelectedPort: (value: number | null) => void;
  setSearchText: (value: string) => void;
  setMinPort: (value: string) => void;
  setMaxPort: (value: string) => void;
  resetFilters: () => void;
  setSort: (key: SortKey, asc?: boolean) => void;

  toggleFavorite: (port: number) => void;
  toggleWatched: (port: number) => void;

  refresh: () => Promise<void>;
  openTunnel: (port: number) => Promise<void>;
  renewTunnel: (port: number) => Promise<void>;
  closeTunnel: (port: number) => Promise<void>;
  stopAllTunnels: () => Promise<void>;

  copyText: (value: string) => Promise<void>;
  clearError: () => void;
};

function toggleInSortedList(list: number[], value: number) {
  const next = new Set(list);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return [...next].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
}

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ports: [],
      tunnels: [],
      busyPorts: {},
      error: null,

      sidebar: "all",
      selectedPort: null,

      searchText: "",
      minPort: "",
      maxPort: "",

      favorites: [],
      watched: [],

      sortKey: "port",
      sortAsc: true,

      setSidebar: (value) => set({ sidebar: value }),
      setSelectedPort: (value) => set({ selectedPort: value }),
      setSearchText: (value) => set({ searchText: value }),
      setMinPort: (value) => set({ minPort: value }),
      setMaxPort: (value) => set({ maxPort: value }),
      resetFilters: () => set({ minPort: "", maxPort: "" }),
      setSort: (key, asc) =>
        set((s) => {
          if (typeof asc === "boolean") return { sortKey: key, sortAsc: asc };
          return s.sortKey === key ? { sortAsc: !s.sortAsc } : { sortKey: key, sortAsc: true };
        }),

      toggleFavorite: (port) => set((s) => ({ favorites: toggleInSortedList(s.favorites, port) })),
      toggleWatched: (port) => set((s) => ({ watched: toggleInSortedList(s.watched, port) })),

      clearError: () => set({ error: null }),

      refresh: async () => {
        set({ error: null });
        const [ports, tunnels] = await Promise.all([
          invoke<PortInfo[]>("list_ports"),
          invoke<TunnelInfo[]>("list_tunnels"),
        ]);
        set({ ports, tunnels });
      },

      openTunnel: async (port) => {
        set((s) => ({ busyPorts: { ...s.busyPorts, [port]: true }, error: null }));
        try {
          await invoke<string>("open_tunnel", { port });
          await get().refresh();
        } catch (e) {
          set({ error: String(e) });
        } finally {
          set((s) => ({ busyPorts: { ...s.busyPorts, [port]: false } }));
        }
      },

      renewTunnel: async (port) => {
        set((s) => ({ busyPorts: { ...s.busyPorts, [port]: true }, error: null }));
        try {
          await invoke<string>("renew_tunnel", { port });
          await get().refresh();
        } catch (e) {
          set({ error: String(e) });
        } finally {
          set((s) => ({ busyPorts: { ...s.busyPorts, [port]: false } }));
        }
      },

      closeTunnel: async (port) => {
        set((s) => ({ busyPorts: { ...s.busyPorts, [port]: true }, error: null }));
        try {
          await invoke<void>("close_tunnel", { port });
          await get().refresh();
        } catch (e) {
          set({ error: String(e) });
        } finally {
          set((s) => ({ busyPorts: { ...s.busyPorts, [port]: false } }));
        }
      },

      stopAllTunnels: async () => {
        const tunnels = get().tunnels.slice();
        set({ error: null });
        for (const t of tunnels) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await invoke<void>("close_tunnel", { port: t.port });
          } catch {
            // ignore
          }
        }
        await get().refresh();
      },

      copyText: async (value) => {
        await navigator.clipboard.writeText(value);
      },
    }),
    {
      name: "jc:app",
      version: 1,
      partialize: (s) => ({
        sidebar: s.sidebar,
        selectedPort: s.selectedPort,
        searchText: s.searchText,
        minPort: s.minPort,
        maxPort: s.maxPort,
        favorites: s.favorites,
        watched: s.watched,
        sortKey: s.sortKey,
        sortAsc: s.sortAsc,
      }),
    }
  )
);
