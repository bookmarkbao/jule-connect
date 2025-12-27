import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";
import { useAppStore } from "@/store/app-store";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={[
        "inline-block size-2 rounded-full",
        ok ? "bg-emerald-500" : "bg-rose-500",
      ].join(" ")}
    />
  );
}

export default function PopupApp() {
  const ports = useAppStore((s) => s.ports);
  const tunnels = useAppStore((s) => s.tunnels);
  const busyPorts = useAppStore((s) => s.busyPorts);
  const refresh = useAppStore((s) => s.refresh);
  const refreshNow = useAppStore((s) => s.refreshNow);
  const closeTunnel = useAppStore((s) => s.closeTunnel);
  const copyText = useAppStore((s) => s.copyText);

  useEffect(() => {
    refresh().catch(() => {});
    const timer = window.setInterval(() => refresh().catch(() => {}), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const onBlur = () => {
      invoke("hide_tray_popup").catch(() => {});
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Quick Connect</div>
          <div className="truncate text-xs text-muted-foreground">
            {tunnels.length} tunnel(s) · {ports.length} port(s)
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => refreshNow()}>
          Refresh
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 py-2">
          <div className="text-xs font-semibold text-muted-foreground">
            Active Tunnels
          </div>

          <div className="mt-2 space-y-2">
            {tunnels.length ? (
              tunnels.map((t) => (
                <div
                  key={t.port}
                  className="flex items-start gap-2 rounded-md border p-2"
                >
                  <div className="pt-1">
                    <StatusDot ok={true} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">:{t.port}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {t.provider}
                      </div>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.url}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyText(t.url)}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => closeTunnel(t.port)}
                      disabled={!!busyPorts[t.port]}
                    >
                      Stop
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border p-2 text-xs text-muted-foreground">
                No active tunnels
              </div>
            )}
          </div>

          <Separator className="my-3" />

          <div className="text-xs font-semibold text-muted-foreground">
            Local Ports
          </div>
          <div className="mt-2 space-y-2">
            {ports.length ? (
              ports.slice(0, 30).map((p) => (
                <div
                  key={`${p.protocol}:${p.address}:${p.port}:${p.pid}`}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                >
                  <StatusDot ok={p.is_active} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">:{p.port}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.process_name || "Unknown"}
                      </div>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {p.protocol.toUpperCase()} · {p.address} · PID {p.pid}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border p-2 text-xs text-muted-foreground">
                No ports detected
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
        <div className="text-xs text-muted-foreground">
          Popup closes on blur
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => invoke("show_main_window").catch(() => {})}
          >
            Open
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              invoke("quit_app")
                .then(() => {})
                .catch((e) => toast.error("Quit failed", { description: String(e) }));
            }}
          >
            Quit
          </Button>
        </div>
      </div>
    </div>
  );
}

