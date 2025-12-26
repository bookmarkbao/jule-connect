import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { SidebarKey } from "@/components/app-sidebar";
import { toast } from "@/lib/toast";

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

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
  isRefreshing: boolean;
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
  refreshNow: () => Promise<void>;
  openTunnel: (port: number) => Promise<void>;
  renewTunnel: (port: number) => Promise<void>;
  closeTunnel: (port: number) => Promise<void>;
  stopAllTunnels: () => Promise<void>;
  killPort: (port: number, pid: number) => Promise<void>;
  openExternalUrl: (url: string) => Promise<void>;

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
      isRefreshing: false,
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

      toggleFavorite: (port) =>
        set((s) => {
          const had = s.favorites.includes(port);
          const next = toggleInSortedList(s.favorites, port);
          toast.success(had ? `Unfavorited :${port}` : `Favorited :${port}`);
          return { favorites: next };
        }),
      toggleWatched: (port) =>
        set((s) => {
          const had = s.watched.includes(port);
          const next = toggleInSortedList(s.watched, port);
          toast.success(had ? `Unwatched :${port}` : `Watched :${port}`);
          return { watched: next };
        }),

      clearError: () => set({ error: null }),

      refresh: async () => {
        set({ error: null });
        const [ports, tunnels] = await Promise.all([
          invoke<PortInfo[]>("list_ports"),
          invoke<TunnelInfo[]>("list_tunnels"),
        ]);
        set({ ports, tunnels });
      },

      refreshNow: async () => {
        const id = toast.loading("Refreshing ports...");
        set({ isRefreshing: true, error: null });
        try {
          await get().refresh();
          toast.success("Refreshed", { id });
        } catch (e) {
          const msg = String(e);
          toast.error("Refresh failed", { id, description: msg });
          set({ error: msg });
        } finally {
          set({ isRefreshing: false });
        }
      },

      openTunnel: async (port) => {
        set((s) => ({ busyPorts: { ...s.busyPorts, [port]: true }, error: null }));
        const id = toast.loading(`Creating share link for :${port}...`);
        await nextFrame();
        try {
          const url = await invoke<string>("open_tunnel", { port });
          await get().refresh();
          toast.success(`Share link ready (:${port})`, {
            id,
            description: url,
          });
        } catch (e) {
          const msg = String(e);
          toast.error(`Create share link failed (:${port})`, {
            id,
            description: msg,
          });
          set({ error: msg });
        } finally {
          set((s) => ({ busyPorts: { ...s.busyPorts, [port]: false } }));
        }
      },

      renewTunnel: async (port) => {
        set((s) => ({ busyPorts: { ...s.busyPorts, [port]: true }, error: null }));
        const id = toast.loading(`Renewing share link (:${port})...`);
        await nextFrame();
        try {
          const url = await invoke<string>("renew_tunnel", { port });
          await get().refresh();
          toast.success(`Share link renewed (:${port})`, {
            id,
            description: url,
          });
        } catch (e) {
          const msg = String(e);
          toast.error(`Renew share link failed (:${port})`, {
            id,
            description: msg,
          });
          set({ error: msg });
        } finally {
          set((s) => ({ busyPorts: { ...s.busyPorts, [port]: false } }));
        }
      },

      closeTunnel: async (port) => {
        set((s) => ({ busyPorts: { ...s.busyPorts, [port]: true }, error: null }));
        const id = toast.loading(`Closing share link (:${port})...`);
        await nextFrame();
        try {
          await invoke<void>("close_tunnel", { port });
          await get().refresh();
          toast.success(`Share link closed (:${port})`, { id });
        } catch (e) {
          const msg = String(e);
          toast.error(`Close share link failed (:${port})`, {
            id,
            description: msg,
          });
          set({ error: msg });
        } finally {
          set((s) => ({ busyPorts: { ...s.busyPorts, [port]: false } }));
        }
      },

      stopAllTunnels: async () => {
        const tunnels = get().tunnels.slice();
        set({ error: null });
        const id = toast.loading(`Closing ${tunnels.length} share link(s)...`);
        for (const t of tunnels) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await invoke<void>("close_tunnel", { port: t.port });
          } catch {
            // ignore
          }
        }
        try {
          await get().refresh();
          toast.success("All tunnels closed", { id });
        } catch (e) {
          const msg = String(e);
          toast.error("Close tunnels finished with errors", { id, description: msg });
          set({ error: msg });
        }
      },

      killPort: async (port, pid) => {
        if (!Number.isFinite(pid) || pid <= 0) return;
        set((s) => ({ busyPorts: { ...s.busyPorts, [port]: true }, error: null }));
        const id = toast.loading(`Killing PID ${pid} (:${port})...`);
        await nextFrame();
        try {
          await invoke<void>("kill_pid", { pid, force: true });
          await get().refresh();
          toast.success(`Killed PID ${pid}`, { id, description: `:${port}` });
        } catch (e) {
          const msg = String(e);
          toast.error(`Kill failed (PID ${pid})`, { id, description: msg });
          set({ error: msg });
        } finally {
          set((s) => ({ busyPorts: { ...s.busyPorts, [port]: false } }));
        }
      },

      openExternalUrl: async (url) => {
        try {
          await invoke<void>("open_url", { url });
          toast.success("Opening in browser...");
        } catch (e) {
          toast.error("Open failed", { description: String(e) });
        }
      },

      copyText: async (value) => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success("Copied");
        } catch (e) {
          toast.error("Copy failed", { description: String(e) });
        }
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
