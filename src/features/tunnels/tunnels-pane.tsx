import { Cloud, Copy, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtTime } from "@/features/ports/format";
import type { TunnelInfo } from "@/store/app-store";

export function TunnelsPane({
  tunnels,
  onStopAll,
  onCopy,
  onRenew,
  onClose,
}: {
  tunnels: TunnelInfo[];
  onStopAll: () => void;
  onCopy: (url: string) => void;
  onRenew: (port: number) => void;
  onClose: (port: number) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Active tunnels</div>
            <Button variant="destructive" size="sm" onClick={onStopAll} disabled={!tunnels.length}>
              <X className="h-4 w-4" />
              Stop All
            </Button>
          </div>
          <div className="grid gap-2">
            {tunnels.length ? (
              tunnels
                .slice()
                .sort((a, b) => a.port - b.port)
                .map((t) => (
                  <Card key={t.port} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4 text-muted-foreground" />
                          <div className="font-mono text-sm">:{t.port}</div>
                          <Badge variant="secondary" className="font-mono">
                            {t.provider}
                          </Badge>
                        </div>
                        <div className="mt-1 break-all font-mono text-sm">{t.url}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          renewed: {fmtTime(t.last_renewed_at_ms)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onCopy(t.url)}>
                          <Copy className="h-4 w-4" />
                          Copy
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => onRenew(t.port)}>
                          Renew
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onClose(t.port)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
            ) : (
              <Card className="p-6">
                <div className="text-sm font-medium">No Active Tunnels</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  从端口列表中对某个 port 执行 Share，创建一个 public URL。
                </div>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

