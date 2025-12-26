import { useEffect, useMemo } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/features/layout/header";
import { PortDetailPane } from "@/features/ports/port-detail-pane";
import { PortsTable } from "@/features/ports/ports-table";
import {
  buildTunnelsByPort,
  computeCounts,
  filterPorts,
  portsWithPlaceholders,
} from "@/features/ports/ports-selectors";
import { TunnelsPane } from "@/features/tunnels/tunnels-pane";
import { useAppStore } from "@/store/app-store";

export default function App() {
  const ports = useAppStore((s) => s.ports);
  const tunnels = useAppStore((s) => s.tunnels);
  const busyPorts = useAppStore((s) => s.busyPorts);
  const error = useAppStore((s) => s.error);

  const sidebar = useAppStore((s) => s.sidebar);
  const selectedPort = useAppStore((s) => s.selectedPort);
  const searchText = useAppStore((s) => s.searchText);
  const minPort = useAppStore((s) => s.minPort);
  const maxPort = useAppStore((s) => s.maxPort);
  const favorites = useAppStore((s) => s.favorites);
  const watched = useAppStore((s) => s.watched);
  const sortKey = useAppStore((s) => s.sortKey);
  const sortAsc = useAppStore((s) => s.sortAsc);

  const setSidebar = useAppStore((s) => s.setSidebar);
  const setSelectedPort = useAppStore((s) => s.setSelectedPort);
  const setSearchText = useAppStore((s) => s.setSearchText);
  const setMinPort = useAppStore((s) => s.setMinPort);
  const setMaxPort = useAppStore((s) => s.setMaxPort);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const setSort = useAppStore((s) => s.setSort);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const toggleWatched = useAppStore((s) => s.toggleWatched);
  const refresh = useAppStore((s) => s.refresh);
  const refreshNow = useAppStore((s) => s.refreshNow);
  const openTunnel = useAppStore((s) => s.openTunnel);
  const renewTunnel = useAppStore((s) => s.renewTunnel);
  const closeTunnel = useAppStore((s) => s.closeTunnel);
  const stopAllTunnels = useAppStore((s) => s.stopAllTunnels);
  const killPort = useAppStore((s) => s.killPort);
  const copyText = useAppStore((s) => s.copyText);
  const openExternalUrl = useAppStore((s) => s.openExternalUrl);
  const isRefreshing = useAppStore((s) => s.isRefreshing);

  useEffect(() => {
    refresh().catch(() => {});
    const timer = window.setInterval(() => {
      refresh().catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const tunnelsByPort = useMemo(() => buildTunnelsByPort(tunnels), [tunnels]);

  const allPortsWithPlaceholders = useMemo(
    () => portsWithPlaceholders(ports, favorites, watched),
    [ports, favorites, watched]
  );

  const filteredPorts = useMemo(
    () =>
      filterPorts({
        ports: allPortsWithPlaceholders,
        sidebar,
        favorites,
        watched,
        searchText,
        minPort,
        maxPort,
      }),
    [
      allPortsWithPlaceholders,
      sidebar,
      favorites,
      watched,
      searchText,
      minPort,
      maxPort,
    ]
  );

  const counts = useMemo(
    () => computeCounts(ports, favorites, watched, tunnels),
    [ports, favorites, watched, tunnels]
  );

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const watchedSet = useMemo(() => new Set(watched), [watched]);

  const selectedPortInfo = useMemo(() => {
    if (selectedPort == null) return null;
    return (
      allPortsWithPlaceholders.find((p) => p.port === selectedPort) ?? null
    );
  }, [selectedPort, allPortsWithPlaceholders]);

  const selectedTunnel = useMemo(() => {
    if (!selectedPortInfo) return null;
    return tunnelsByPort.get(selectedPortInfo.port) ?? null;
  }, [selectedPortInfo, tunnelsByPort]);

  return (
    <SidebarProvider
      defaultOpen={true}
      className="h-full overflow-hidden border-t"
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        active={sidebar}
        onActiveChange={(k) => setSidebar(k)}
        counts={counts}
        minPort={minPort}
        maxPort={maxPort}
        onMinPortChange={(v) => setMinPort(v)}
        onMaxPortChange={(v) => setMaxPort(v)}
        onResetFilters={resetFilters}
        onAddFavoritePort={() => {
          const raw = window.prompt("Add favorite port (number):");
          if (!raw) return;
          const p = Number(raw);
          if (!Number.isFinite(p)) return;
          toggleFavorite(p);
          setSidebar("favorites");
        }}
        onAddWatchedPort={() => {
          const raw = window.prompt("Add watched port (number):");
          if (!raw) return;
          const p = Number(raw);
          if (!Number.isFinite(p)) return;
          toggleWatched(p);
          setSidebar("watched");
        }}
      />

      <SidebarInset className="h-full">
        <div className="flex h-full flex-col">
          <SiteHeader
            title={sidebar === "tunnels" ? "Cloudflare Tunnels" : "Ports"}
            onRefresh={() => refreshNow()}
            searchText={searchText}
            onSearchTextChange={(v) => setSearchText(v)}
            refreshDisabled={isRefreshing || Object.values(busyPorts).some(Boolean)}
            isRefreshing={isRefreshing}
          />

          {error ? (
            <div className="border-b px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1">
            <ResizablePanelGroup
              direction="horizontal"
              className="min-h-0 flex-1"
            >
              <ResizablePanel defaultSize={75}>
                <div className="flex h-full min-w-0 flex-col">
                  {sidebar === "tunnels" ? (
                    <TunnelsPane
                      tunnels={tunnels}
                      onStopAll={() => stopAllTunnels()}
                      onCopy={(url) => copyText(url)}
                      onOpenUrl={(url) => openExternalUrl(url)}
                      onRenew={(port) => renewTunnel(port)}
                      onClose={(port) => closeTunnel(port)}
                    />
                  ) : (
                    <div className="min-h-0 flex-1">
                      <PortsTable
                        ports={filteredPorts}
                        selectedPort={selectedPort}
                        tunnelsByPort={tunnelsByPort}
                        busyPorts={busyPorts}
                        favorites={favoritesSet}
                        watched={watchedSet}
                        sortKey={sortKey}
                        sortAsc={sortAsc}
                        onSelectPort={(p) => setSelectedPort(p)}
                        onSort={(k, asc) => setSort(k, asc)}
                        onToggleFavorite={(p) => toggleFavorite(p)}
                        onToggleWatched={(p) => toggleWatched(p)}
                        onCopy={(url) => copyText(url)}
                        onRenew={(p) => renewTunnel(p)}
                        onClose={(p) => closeTunnel(p)}
                        onOpen={(p) => openTunnel(p)}
                        onKill={(port, pid) => killPort(port, pid)}
                      />
                    </div>
                  )}

                  <div className="border-t bg-background px-4 py-2 pb-5 text-xs text-muted-foreground">
                    {sidebar === "tunnels" ? (
                      <span>{tunnels.length} tunnel(s)</span>
                    ) : (
                      <span>
                        {filteredPorts.length} of{" "}
                        {allPortsWithPlaceholders.length} ports
                      </span>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={35} minSize={20}>
                <PortDetailPane
                  port={selectedPortInfo}
                  tunnel={selectedTunnel}
                  isBusy={
                    selectedPortInfo
                      ? !!busyPorts[selectedPortInfo.port]
                      : false
                  }
                  isFavorite={
                    selectedPortInfo
                      ? favoritesSet.has(selectedPortInfo.port)
                      : false
                  }
                  isWatched={
                    selectedPortInfo
                      ? watchedSet.has(selectedPortInfo.port)
                      : false
                  }
                  onToggleFavorite={(p) => toggleFavorite(p)}
                  onToggleWatched={(p) => toggleWatched(p)}
                  onCopy={(v) => copyText(v)}
                  onOpenUrl={(url) => openExternalUrl(url)}
                  onOpenTunnel={(p) => openTunnel(p)}
                  onRenewTunnel={(p) => renewTunnel(p)}
                  onCloseTunnel={(p) => closeTunnel(p)}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
