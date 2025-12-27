import { invoke } from "@tauri-apps/api/core";
import { Cloud, Copy, ExternalLink, Globe, Power, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const closeTunnel = useAppStore((s) => s.closeTunnel);
  const copyText = useAppStore((s) => s.copyText);

  const [searchQuery, setSearchQuery] = useState("");

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

  const killPort = async (pid: number) => {
    try {
      await invoke("kill_pid", { pid, force: true });
      toast.success("Process killed");
      refresh().catch(() => {});
    } catch (e) {
      toast.error("Failed to kill process", { description: String(e) });
    }
  };

  const filteredPorts = ports.filter(
    (p) =>
      searchQuery === "" ||
      p.port.toString().includes(searchQuery) ||
      (p.process_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCount = ports.length;

  return (
    <div className="flex h-full flex-col bg-background ">
      {/* Search Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Globe className="size-5 shrink-0 text-muted-foreground" />
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searchQuery ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setSearchQuery("")}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-600" >
          {totalCount}
        </div>
      </div>

      <ScrollArea className="min-h-0 w-[339px] flex-1">
        <div className="px-3 py-2">
          {/* Cloudflare Tunnels Section */}
          <div className="mb-2 flex items-center gap-2">
            <Cloud className="size-5 text-orange-500 fill-orange-500" />
            <div className="text-sm font-semibold text-foreground">
              Cloudflare Tunnels
            </div>
          </div>

          <div className="space-y-1">
            {tunnels.length ? (
              tunnels.map((t) => (
                <div
                  key={t.port}
                  className="group flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1.5"
                >
                  <StatusDot ok={true} />
                  <div className="w-14 shrink-0 text-sm font-semibold">
                    :{t.port}
                  </div>
                  <div className="w-[180px] truncate text-sm text-cyan-600">
                    {t.url}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 shrink-0"
                    onClick={() => copyText(t.url)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => closeTunnel(t.port)}
                    disabled={!!busyPorts[t.port]}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-2 text-center text-xs text-muted-foreground">
                {searchQuery ? "No matching tunnels" : "No active tunnels"}
              </div>
            )}
          </div>
          {filteredPorts.length > 0 && (
            <>
              <div className="mb-2 mt-3 flex items-center gap-2">
                <Globe className="size-5 shrink-0 text-green-500" />
                <div className="text-sm font-semibold text-foreground">
                  Local Ports
                </div>
              </div>

              <div className="space-y-1">
                {filteredPorts.slice(0, 30).map((p) => {
                  return (
                    <div
                      key={`${p.protocol}:${p.address}:${p.port}:${p.pid}`}
                      className="group flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1.5"
                    >
                      <StatusDot ok={p.is_active} />
                      <div className="w-12 shrink-0 text-sm font-semibold">
                        :{p.port}
                      </div>
                      <div className="w-[140px] truncate text-sm text-muted-foreground">
                        {p.process_name || "Unknown"}
                      </div>
                      <div className="w-16 shrink-0 text-xs text-muted-foreground">
                        PID {p.pid}
                      </div>
                      <div className="ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 shrink-0 text-rose-500 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => killPort(p.pid)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => invoke("show_main_window").catch(() => {})}
        >
          <ExternalLink className="size-3.5" />
          Open JC
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            invoke("quit_app").catch((e) =>
              toast.error("Quit failed", { description: String(e) })
            );
          }}
        >
          <Power className="size-3.5" />
          Quit JC
        </Button>
      </div>
    </div>
  );
}
