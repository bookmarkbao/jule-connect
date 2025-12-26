import {
  Activity,
  Cloud,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";
import { ClipLoader } from "react-spinners";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  if (!port) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <div className="mb-2 rounded-full bg-muted/50 p-3">
          <Activity className="h-6 w-6" />
        </div>
        <div className="text-lg font-semibold text-foreground">
          No Port Selected
        </div>
        <p className="text-sm">Select a port from the list to view details.</p>
      </div>
    );
  }

  const processType = detectProcessType(port.process_name);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <h1
              className="break-all text-2xl font-bold tracking-tight"
              title={port.process_name}
            >
              {port.process_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={port.is_active ? "default" : "secondary"}
                className={
                  port.is_active
                    ? "bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:text-green-400"
                    : "text-muted-foreground"
                }
              >
                {port.is_active ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {port.port}
              </Badge>
              <Badge variant="outline">{port.protocol}</Badge>
              <Badge variant="secondary">
                {processTypeLabel(processType)}
              </Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={
                isFavorite
                  ? "text-yellow-500 hover:text-yellow-600 dark:text-yellow-400"
                  : "text-muted-foreground"
              }
              onClick={() => onToggleFavorite(port.port)}
              title={isFavorite ? "Unfavorite" : "Favorite"}
            >
              <Star className={isFavorite ? "fill-current" : ""} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={
                isWatched
                  ? "text-sky-500 hover:text-sky-600 dark:text-sky-400"
                  : "text-muted-foreground"
              }
              onClick={() => onToggleWatched(port.port)}
              title={isWatched ? "Unwatch" : "Watch"}
            >
              {isWatched ? <Eye /> : <EyeOff />}
            </Button>
          </div>
        </div>

        {/* Tunnel Section */}
        <Card className="overflow-hidden bg-gradient-to-br from-muted/50 to-muted/10 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Cloud className="h-4 w-4" />
              Cloudflare Tunnel
            </div>
            {tunnel && (
              <Badge variant="outline" className="bg-background">
                {tunnel.provider}
              </Badge>
            )}
          </div>

          {!port.is_active ? (
             <div className="flex min-h-[100px] flex-col items-center justify-center rounded-lg border border-dashed bg-background/50 p-6 text-center text-sm text-muted-foreground">
               Port is inactive. Start the service to create a tunnel.
             </div>
          ) : !tunnel ? (
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <p className="max-w-[280px] text-center text-sm text-muted-foreground">
                Expose this port to the internet securely using Cloudflare Tunnel.
              </p>
              <Button onClick={() => onOpenTunnel(port.port)} disabled={isBusy}>
                {isBusy ? (
                  <ClipLoader size={16} color="currentColor" className="mr-2" />
                ) : (
                  <Cloud className="mr-2 h-4 w-4" />
                )}
                {isBusy ? "Creating Tunnel..." : "Create Share Link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-background p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Public URL
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">{tunnel.url}</span>
                  <div className="flex gap-1">
                     <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onCopy(tunnel.url)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onOpenUrl(tunnel.url)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Renewed: {fmtTime(tunnel.last_renewed_at_ms)}</span>
                <div className="flex gap-2">
                   <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 hover:text-foreground"
                    onClick={() => onRenewTunnel(port.port)}
                    disabled={isBusy}
                  >
                    {isBusy && <ClipLoader size={10} color="currentColor" className="mr-1" />}
                    Renew
                  </Button>
                   <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onCloseTunnel(port.port)}
                    disabled={isBusy}
                  >
                     {isBusy && <ClipLoader size={10} color="currentColor" className="mr-1" />}
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Details Section */}
        <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
                 <h3 className="font-semibold">Process Details</h3>
                 <dl className="grid grid-cols-1 gap-x-4 gap-y-4 text-sm sm:grid-cols-2">
                    <DetailItem label="PID" value={port.pid ? String(port.pid) : "-"} mono />
                    <DetailItem label="User" value={port.user} />
                    <DetailItem label="Address" value={port.address} mono />
                 </dl>
            </div>
        </div>

         {/* Command Section */}
         <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Command</h3>
                 <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 text-xs"
                    onClick={() => onCopy(port.command || port.process_name)}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
            </div>
            <ScrollArea className="w-full whitespace-pre rounded-md border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                 {port.command || port.process_name || "-"}
                 <ScrollBar orientation="horizontal" />
            </ScrollArea>
         </div>
      </div>
    </ScrollArea>
  );
}

function DetailItem({
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
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={mono ? "mt-1 font-mono text-sm" : "mt-1 text-sm"}>
        {value}
      </dd>
    </div>
  );
}
