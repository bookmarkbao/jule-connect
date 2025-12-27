import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  MoreHorizontal,
  Star,
  Skull,
  X,
} from "lucide-react";
import { ClipLoader } from "react-spinners";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  detectProcessType,
  processTypeLabel,
} from "@/features/ports/process-type";
import type { PortInfo, SortKey, TunnelInfo } from "@/store/app-store";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const SORT_COL_TO_KEY: Record<string, SortKey> = {
  active: "active",
  port: "port",
  process: "process",
  pid: "pid",
  type: "type",
  address: "address",
  user: "user",
  actions: "actions",
};

const SORT_KEY_TO_COL: Record<SortKey, string> = {
  active: "active",
  port: "port",
  process: "process",
  pid: "pid",
  type: "type",
  address: "address",
  user: "user",
  actions: "actions",
};

export function PortsTable({
  ports,
  selectedPort,
  tunnelsByPort,
  busyPorts,
  favorites,
  watched,
  sortKey,
  sortAsc,
  onSelectPort,
  onSort,
  onToggleFavorite,
  onToggleWatched,
  onCopy,
  onRenew,
  onClose,
  onOpen,
  onKill,
}: {
  ports: PortInfo[];
  selectedPort: number | null;
  tunnelsByPort: Map<number, TunnelInfo>;
  busyPorts: Record<number, boolean>;
  favorites: Set<number>;
  watched: Set<number>;
  sortKey: SortKey;
  sortAsc: boolean;
  onSelectPort: (port: number) => void;
  onSort: (key: SortKey, asc: boolean) => void;
  onToggleFavorite: (port: number) => void;
  onToggleWatched: (port: number) => void;
  onCopy: (url: string) => void;
  onRenew: (port: number) => void;
  onClose: (port: number) => void;
  onOpen: (port: number) => void;
  onKill: (port: number, pid: number, force?: boolean) => void;
}) {
  const columns = React.useMemo<ColumnDef<PortInfo>[]>(
    () => [
      {
        id: "actions",
        header: ({ column }) => (
          <HeaderSortButton
            title="★"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sortState={column.getIsSorted()}
          />
        ),
        cell: ({ row }) => {
          const p = row.original;
          const isFavorite = favorites.has(p.port);
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={[
                  "h-8 px-2 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-400",
                  isFavorite ? "text-yellow-500" : "text-muted-foreground",
                ].join(" ")}
                onClick={(e) => (e.stopPropagation(), onToggleFavorite(p.port))}
                title={isFavorite ? "Unfavorite" : "Favorite"}
              >
                <Star
                  className={["h-4 w-4", isFavorite ? "fill-current" : ""].join(
                    " "
                  )}
                />
              </Button>
            </div>
          );
        },
        enableSorting: true,
        sortingFn: (a, b) => {
          const aP = favorites.has(a.original.port)
            ? 2
            : watched.has(a.original.port)
            ? 1
            : 0;
          const bP = favorites.has(b.original.port)
            ? 2
            : watched.has(b.original.port)
            ? 1
            : 0;
          return aP === bP ? a.original.port - b.original.port : bP - aP;
        },
      },
      {
        accessorKey: "port",
        header: ({ column }) => (
          <HeaderSortButton
            title="Port"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sortState={column.getIsSorted()}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full outline outline-2 outline-offset-2",
                row.original.is_active
                  ? "bg-emerald-500 outline-emerald-500/20"
                  : "bg-muted-foreground/30 outline-transparent"
              )}
            />
            <span className="font-mono font-bold text-foreground">
              :{row.original.port}
            </span>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "process_name",
        id: "process",
        header: ({ column }) => (
          <HeaderSortButton
            title="Process"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sortState={column.getIsSorted()}
          />
        ),
        cell: ({ row }) => (
          <div className="truncate font-medium text-foreground">
            {row.original.process_name}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "pid",
        header: ({ column }) => (
          <HeaderSortButton
            title="PID"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sortState={column.getIsSorted()}
          />
        ),
        cell: ({ row }) => (
          <div className="font-mono text-muted-foreground">
            {row.original.pid || "-"}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: "type",
        header: ({ column }) => (
          <HeaderSortButton
            title="Type"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sortState={column.getIsSorted()}
          />
        ),
        cell: ({ row }) => {
          const type = detectProcessType(row.original.process_name);
          return <Badge variant="secondary">{processTypeLabel(type)}</Badge>;
        },
        enableSorting: true,
        sortingFn: (a, b) => {
          const at = detectProcessType(a.original.process_name);
          const bt = detectProcessType(b.original.process_name);
          return at.localeCompare(bt);
        },
      },
      {
        accessorKey: "address",
        header: ({ column }) => (
          <HeaderSortButton
            title="Address"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sortState={column.getIsSorted()}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">
            {row.original.address}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: "user",
        header: ({ column }) => (
          <HeaderSortButton
            title="User"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            sortState={column.getIsSorted()}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">
            {row.original.user}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: "menu",
        enableHiding: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const p = row.original;
          const isWatched = watched.has(p.port);

          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={[
                  "h-8 px-2 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400",
                  isWatched ? "text-sky-500" : "text-muted-foreground",
                ].join(" ")}
                onClick={(e) => (e.stopPropagation(), onToggleWatched(p.port))}
                title={isWatched ? "Unwatch" : "Watch"}
              >
                {isWatched ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              {/* quit process (SIGTERM) */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
                disabled={!p.is_active || !p.pid || !!busyPorts[p.port]}
                title={
                  !p.is_active || !p.pid
                    ? "No process to quit"
                    : busyPorts[p.port]
                    ? "Busy"
                    : "Quit process (SIGTERM)"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (!p.is_active || !p.pid) return;
                  const ok = window.confirm(
                    `Quit process PID ${p.pid} on port :${p.port}?`
                  );
                  if (!ok) return;
                  onKill(p.port, p.pid, false);
                }}
              >
                {busyPorts[p.port] ? (
                  <ClipLoader size={16} color="currentColor" />
                ) : (
                  <X className="size-4" />
                )}
              </Button>
              {/* force kill (SIGKILL) */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                disabled={!p.is_active || !p.pid || !!busyPorts[p.port]}
                title={
                  !p.is_active || !p.pid
                    ? "No process to kill"
                    : busyPorts[p.port]
                    ? "Busy"
                    : "Force kill (SIGKILL)"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (!p.is_active || !p.pid) return;
                  const ok = window.confirm(
                    `Force kill PID ${p.pid} on port :${p.port}?`
                  );
                  if (!ok) return;
                  onKill(p.port, p.pid, true);
                }}
              >
                {busyPorts[p.port] ? (
                  <ClipLoader size={16} color="currentColor" />
                ) : (
                  <Skull className="size-4" />
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [
      favorites,
      watched,
      busyPorts,
      onToggleFavorite,
      onToggleWatched,
      onCopy,
      onRenew,
      onClose,
      onOpen,
      onKill,
      tunnelsByPort,
    ]
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const sorting = React.useMemo(
    () => [{ id: SORT_KEY_TO_COL[sortKey], desc: !sortAsc }],
    [sortKey, sortAsc]
  );

  const table = useReactTable({
    data: ports,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      if (first?.id && SORT_COL_TO_KEY[first.id]) {
        onSort(SORT_COL_TO_KEY[first.id], !first.desc);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => String(row.port),
  });

  return (
    <ScrollArea className="h-full">
      <Table className="min-w-[750px] table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const isSticky = header.id === "menu";
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      widthClassNameForColumn(header.id),
                      isSticky && "sticky right-0 z-20 bg-background/95 backdrop-blur shadow-[-2px_0_2px_-2px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_2px_-2px_rgba(0,0,0,0.3)]"
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const isSelected = selectedPort === row.original.port;
              return (
                <TableRow
                  key={row.id}
                  data-state={isSelected ? "selected" : undefined}
                  className={cn(
                    "group cursor-pointer border-b transition-colors hover:bg-muted/50",
                    isSelected && "bg-muted shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
                  )}
                  onClick={() => onSelectPort(row.original.port)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isSticky = cell.column.id === "menu";
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-2.5",
                          widthClassNameForColumn(cell.column.id),
                          cellClassNameForColumn(cell.column.id),
                          isSticky && cn(
                            "sticky right-0 z-4 bg-background transition-colors group-hover:bg-muted/50 shadow-[-2px_0_2px_-2px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_2px_-2px_rgba(0,0,0,0.3)]",
                            isSelected && "bg-muted"
                          )
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {/* 横向滚动条 */}
      <ScrollBar orientation="horizontal" className="bottom-0" />
    </ScrollArea>
  );
}

function HeaderSortButton({
  title,
  onClick,
  sortState,
}: {
  title: string;
  onClick: () => void;
  sortState: false | "asc" | "desc";
}) {
  return (
    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onClick}>
      <span className="flex items-center gap-1">
        <span>{title}</span>
        <span className="flex items-center">
          <ChevronUp
            className={[
              "h-3 w-3",
              sortState === "asc" ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
          <ChevronDown
            className={[
              "h-3 w-3",
              sortState === "desc" ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        </span>
      </span>
    </Button>
  );
}

function widthClassNameForColumn(id: string) {
  if (id === "actions") return "w-[48px]";
  if (id === "port") return "w-[100px]";
  if (id === "process") return "w-[160px]";
  if (id === "pid") return "w-[80px]";
  if (id === "type") return "w-[120px]";
  if (id === "address") return "w-[160px]";
  if (id === "user") return "w-[100px]";
  if (id === "menu") return "w-[80px]";
  return "";
}

function cellClassNameForColumn(id: string) {
  if (id === "menu") return "text-right";
  return "";
}
