import { Cloud, Copy, Eye, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtTime } from "@/features/ports/format";
import { detectProcessType, processTypeLabel } from "@/features/ports/process-type";
import type { PortInfo, TunnelInfo } from "@/store/app-store";

export function PortDetailPane({
  port,
  tunnel,
  isBusy,
  isFavorite,
  isWatched,
  onToggleFavorite,
  onToggleWatched,
  onCopy,
  onOpenTunnel,
  onRenewTunnel,
  onCloseTunnel,
}: {
  port: PortInfo | null;
  tunnel: TunnelInfo | null;
  isBusy: boolean;
  isFavorite: boolean;
  isWatched: boolean;
  onToggleFavorite: (port: number) => void;
  onToggleWatched: (port: number) => void;
  onCopy: (value: string) => void;
  onOpenTunnel: (port: number) => void;
  onRenewTunnel: (port: number) => void;
  onCloseTunnel: (port: number) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold">Details</div>
        <div className="text-xs text-muted-foreground">选中一行查看详情与 tunnel 操作</div>
      </div>

      <ScrollArea className="min-h-0 flex-1 p-4">
        {port ? (
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{port.process_name}</div>
                  {!port.is_active ? <Badge variant="outline">inactive</Badge> : null}
                </div>
                <div className="mt-1 font-mono text-sm text-muted-foreground">:{port.port}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onToggleFavorite(port.port)}>
                  <Star className="h-4 w-4" />
                  {isFavorite ? "Unfavorite" : "Favorite"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onToggleWatched(port.port)}>
                  <Eye className="h-4 w-4" />
                  {isWatched ? "Unwatch" : "Watch"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Detail label="Port" value={String(port.port)} mono />
              <Detail label="PID" value={port.pid ? String(port.pid) : "-"} mono />
              <Detail label="Protocol" value={port.protocol} mono />
              <Detail label="Type" value={processTypeLabel(detectProcessType(port.process_name))} />
              <Detail label="Address" value={port.address} mono />
              <Detail label="User" value={port.user} mono />
              <Detail label="FD" value={port.fd} mono />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">Command</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopy(port.command || port.process_name)}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
                {port.command || port.process_name || "-"}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">Tunnel</div>
              {!port.is_active ? (
                <div className="text-sm text-muted-foreground">inactive port（无法创建 tunnel）</div>
              ) : !tunnel ? (
                <Button onClick={() => onOpenTunnel(port.port)} disabled={isBusy}>
                  <Cloud className="h-4 w-4" />
                  Share via Tunnel
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {tunnel.provider}
                    </Badge>
                    <div className="min-w-0 break-all font-mono text-xs">{tunnel.url}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    renewed: {fmtTime(tunnel.last_renewed_at_ms)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onCopy(tunnel.url)} disabled={isBusy}>
                      <Copy className="h-4 w-4" />
                      Copy URL
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onRenewTunnel(port.port)} disabled={isBusy}>
                      Renew
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onCloseTunnel(port.port)} disabled={isBusy}>
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="text-sm font-medium">No Port Selected</div>
            <div className="mt-1 text-sm text-muted-foreground">从列表中选择一个 port 查看详情。</div>
          </Card>
        )}
      </ScrollArea>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "mt-1 font-mono text-xs" : "mt-1 text-sm"}>{value}</div>
    </div>
  );
}

