import * as React from "react";
import { Cloud, Eye, Star } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuItem,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

type ProcessType = "webServer" | "database" | "development" | "system" | "other";

export type SidebarKey = "all" | "favorites" | "watched" | "tunnels" | `type:${ProcessType}`;

export function AppSidebar({
  active,
  onActiveChange,
  counts,
  searchText,
  onSearchTextChange,
  minPort,
  maxPort,
  onMinPortChange,
  onMaxPortChange,
  onResetFilters,
  onAddFavoritePort,
  onAddWatchedPort,
  ...props
}: {
  active: SidebarKey;
  onActiveChange: (key: SidebarKey) => void;
  counts: {
    all: number;
    favorites: number;
    watched: number;
    tunnels: number;
    byType: Record<ProcessType, number>;
  };
  searchText: string;
  onSearchTextChange: (value: string) => void;
  minPort: string;
  maxPort: string;
  onMinPortChange: (value: string) => void;
  onMaxPortChange: (value: string) => void;
  onResetFilters: () => void;
  onAddFavoritePort: () => void;
  onAddWatchedPort: () => void;
} & React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar data-testid="app-sidebar" {...props}>
      <SidebarHeader className="gap-3 px-3 py-4">
        <div className="px-2">
          <div className="text-sm font-semibold leading-none">jule-connect</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Cloudflare Quick Tunnel（需要本机安装 `cloudflared`）
          </div>
        </div>
        <SidebarInput
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          placeholder="Search ports, processes..."
        />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "all"} onClick={() => onActiveChange("all")}>
                <span>All Ports</span>
                <SidebarMenuBadge>{counts.all}</SidebarMenuBadge>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={active === "favorites"}
                onClick={() => onActiveChange("favorites")}
              >
                <Star className="size-4" />
                <span>Favorites</span>
                <SidebarMenuBadge>{counts.favorites}</SidebarMenuBadge>
              </SidebarMenuButton>
              <SidebarMenuButton size="sm" className="mt-1" onClick={onAddFavoritePort}>
                Add favorite port...
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "watched"} onClick={() => onActiveChange("watched")}>
                <Eye className="size-4" />
                <span>Watched</span>
                <SidebarMenuBadge>{counts.watched}</SidebarMenuBadge>
              </SidebarMenuButton>
              <SidebarMenuButton size="sm" className="mt-1" onClick={onAddWatchedPort}>
                Add watched port...
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Networking</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={active === "tunnels"} onClick={() => onActiveChange("tunnels")}>
                <Cloud className="size-4" />
                <span>Cloudflare Tunnels</span>
                <SidebarMenuBadge>{counts.tunnels}</SidebarMenuBadge>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Process Types</SidebarGroupLabel>
          <SidebarMenu>
            <TypeButton
              active={active}
              onActiveChange={onActiveChange}
              value="webServer"
              label="Web Server"
              count={counts.byType.webServer}
            />
            <TypeButton
              active={active}
              onActiveChange={onActiveChange}
              value="database"
              label="Database"
              count={counts.byType.database}
            />
            <TypeButton
              active={active}
              onActiveChange={onActiveChange}
              value="development"
              label="Development"
              count={counts.byType.development}
            />
            <TypeButton
              active={active}
              onActiveChange={onActiveChange}
              value="system"
              label="System"
              count={counts.byType.system}
            />
            <TypeButton
              active={active}
              onActiveChange={onActiveChange}
              value="other"
              label="Other"
              count={counts.byType.other}
            />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Filters</SidebarGroupLabel>
          <div className="grid gap-2 px-2 py-1">
            <div className="grid grid-cols-2 gap-2">
              <SidebarInput value={minPort} onChange={(e) => onMinPortChange(e.target.value)} placeholder="Min port" />
              <SidebarInput value={maxPort} onChange={(e) => onMaxPortChange(e.target.value)} placeholder="Max port" />
            </div>
            {(minPort.trim() || maxPort.trim()) && (
              <SidebarMenuButton size="sm" onClick={onResetFilters}>
                Reset Filters
              </SidebarMenuButton>
            )}
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function TypeButton({
  active,
  onActiveChange,
  value,
  label,
  count,
}: {
  active: SidebarKey;
  onActiveChange: (key: SidebarKey) => void;
  value: ProcessType;
  label: string;
  count: number;
}) {
  const key = `type:${value}` as const;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active === key} onClick={() => onActiveChange(key)}>
        <span>{label}</span>
        <SidebarMenuBadge>{count}</SidebarMenuBadge>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
