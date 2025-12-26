import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PortInfo = {
  port: number;
  pid: number;
  protocol: string;
  command?: string | null;
};

type TunnelInfo = {
  port: number;
  provider: string;
  url: string;
  started_at_ms: number;
  last_renewed_at_ms: number;
};

function fmtTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString();
}

export default function App() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [tunnels, setTunnels] = useState<TunnelInfo[]>([]);
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const tunnelsByPort = useMemo(() => {
    const map = new Map<number, TunnelInfo>();
    for (const t of tunnels) map.set(t.port, t);
    return map;
  }, [tunnels]);

  const refresh = useCallback(async () => {
    setError(null);
    const [p, t] = await Promise.all([
      invoke<PortInfo[]>("list_ports"),
      invoke<TunnelInfo[]>("list_tunnels")
    ]);
    setPorts(p);
    setTunnels(t);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
    const timer = window.setInterval(() => {
      refresh().catch(() => {});
    }, 2500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const onOpen = useCallback(
    async (port: number) => {
      setBusy((b) => ({ ...b, [port]: true }));
      setError(null);
      try {
        await invoke<string>("open_tunnel", { port });
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy((b) => ({ ...b, [port]: false }));
      }
    },
    [refresh]
  );

  const onRenew = useCallback(
    async (port: number) => {
      setBusy((b) => ({ ...b, [port]: true }));
      setError(null);
      try {
        await invoke<string>("renew_tunnel", { port });
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy((b) => ({ ...b, [port]: false }));
      }
    },
    [refresh]
  );

  const onClose = useCallback(
    async (port: number) => {
      setBusy((b) => ({ ...b, [port]: true }));
      setError(null);
      try {
        await invoke<void>("close_tunnel", { port });
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy((b) => ({ ...b, [port]: false }));
      }
    },
    [refresh]
  );

  const onCopy = useCallback(async (url: string) => {
    await navigator.clipboard.writeText(url);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container py-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">jule-connect</h1>
          <Button onClick={() => refresh()} variant="secondary" size="sm">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          内置 provider：Cloudflare Quick Tunnel（需要本机安装 `cloudflared`）
        </div>
        {error ? <div className="mt-3 text-sm text-destructive">{error}</div> : null}

        <div className="mt-4 grid gap-3">
        {ports.map((p) => {
          const t = tunnelsByPort.get(p.port);
          const isBusy = !!busy[p.port];
          return (
            <Card key={p.port} className="p-4">
              <div className="grid gap-3 md:grid-cols-[160px_1fr_auto] md:items-center">
                <div className="space-y-1">
                  <div className="font-mono text-sm">
                    {p.protocol.toUpperCase()} : {p.port}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">pid: {p.pid}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground break-all">
                    {p.command || "unknown process"}
                  </div>
                  {t ? (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {t.provider}
                        </Badge>
                        <span className="font-mono text-sm break-all">{t.url}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        renewed: {fmtTime(t.last_renewed_at_ms)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">not shared</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  {t ? (
                    <>
                      <Button onClick={() => onCopy(t.url)} disabled={isBusy} variant="outline" size="sm">
                        Copy
                      </Button>
                      <Button onClick={() => onRenew(p.port)} disabled={isBusy} variant="secondary" size="sm">
                        Renew
                      </Button>
                      <Button onClick={() => onClose(p.port)} disabled={isBusy} variant="destructive" size="sm">
                        Close
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => onOpen(p.port)} disabled={isBusy} size="sm">
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        </div>
      </div>
    </div>
  );
}
