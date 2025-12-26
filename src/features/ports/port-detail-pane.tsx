import { Cloud, Copy, ExternalLink, Eye, EyeOff, Star } from "lucide-react";
import { ClipLoader } from "react-spinners";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtTime } from "@/features/ports/format";
import {
  detectProcessType,
  processTypeLabel,
} from "@/features/ports/process-type";
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
  onOpenUrl,
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
  onOpenUrl: (url: string) => void;
  onOpenTunnel: (port: number) => void;
  onRenewTunnel: (port: number) => void;
  onCloseTunnel: (port: number) => void;
}) {
  return (
    <ScrollArea className="h-full min-w-0 p-4">
      {port ? (
        <Card className="min-w-0 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="min-w-0 truncate font-semibold" title={port.process_name}>
                  {port.process_name}
                </div>
                {!port.is_active ? (
                  <Badge variant="outline">inactive</Badge>
                ) : null}
              </div>
              <div className="mt-1 font-mono text-sm text-muted-foreground">
                :{port.port}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={isFavorite ? "secondary" : "outline"}
                size="sm"
                className={[
                  "px-2 sm:px-3",
                  isFavorite
                    ? "bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 dark:text-yellow-300"
                    : "",
                ].join(" ")}
                aria-label={isFavorite ? "Unfavorite" : "Favorite"}
                onClick={() => onToggleFavorite(port.port)}
              >
                <Star
                  className={[
                    "h-4 w-4",
                    isFavorite ? "fill-current" : "",
                  ].join(" ")}
                />
                <span className="hidden sm:inline">
                  {isFavorite ? "Unfavorite" : "Favorite"}
                </span>
              </Button>
              <Button
                variant={isWatched ? "secondary" : "outline"}
                size="sm"
                className={[
                  "px-2 sm:px-3",
                  isWatched
                    ? "bg-sky-500/15 text-sky-700 hover:bg-sky-500/25 dark:text-sky-300"
                    : "",
                ].join(" ")}
                aria-label={isWatched ? "Unwatch" : "Watch"}
                onClick={() => onToggleWatched(port.port)}
              >
                {isWatched ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {isWatched ? "Unwatch" : "Watch"}
                </span>
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Detail label="Port" value={String(port.port)} mono />
            <Detail
              label="PID"
              value={port.pid ? String(port.pid) : "-"}
              mono
            />
            <Detail label="Protocol" value={port.protocol} mono />
            <Detail
              label="Type"
              value={processTypeLabel(detectProcessType(port.process_name))}
            />
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
            <div className="break-all rounded-md border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
              {port.command || port.process_name || "-"}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-sm font-medium">Tunnel</div>
            {!port.is_active ? (
              <div className="text-sm text-muted-foreground">
                inactive port（无法创建 tunnel）
              </div>
            ) : !tunnel ? (
              <Button onClick={() => onOpenTunnel(port.port)} disabled={isBusy}>
                {isBusy ? (
                  <ClipLoader size={16} color="currentColor" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                {isBusy ? "Creating..." : "Create Share Link"}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {tunnel.provider}
                  </Badge>
                  <div className="min-w-0 break-all font-mono text-xs">
                    {tunnel.url}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  renewed: {fmtTime(tunnel.last_renewed_at_ms)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCopy(tunnel.url)}
                    disabled={isBusy}
                  >
                    <Copy className="h-4 w-4" />
                    Copy URL
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenUrl(tunnel.url)}
                    disabled={isBusy}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onRenewTunnel(port.port)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <ClipLoader size={16} color="currentColor" />
                    ) : null}
                    Renew
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onCloseTunnel(port.port)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <ClipLoader size={16} color="currentColor" />
                    ) : null}
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="min-w-0 p-6">
          <div className="text-sm font-medium">No Port Selected</div>
          <div className="mt-1 text-sm text-muted-foreground">
            从列表中选择一个 port 查看详情。
          </div>
        </Card>
      )}
    </ScrollArea>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "mt-1 font-mono text-xs" : "mt-1 text-sm"}>
        {value}
      </div>
    </div>
  );
}
