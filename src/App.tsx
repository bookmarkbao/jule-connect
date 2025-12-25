import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

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
    <div className="wrap">
      <div className="header">
        <h1>jule-connect</h1>
        <button onClick={() => refresh()} className="primary">
          Refresh
        </button>
      </div>
      <div className="muted">
        内置 provider：Cloudflare Quick Tunnel（需要本机安装 `cloudflared`）
      </div>
      {error ? (
        <div className="muted" style={{ color: "#b91c1c", marginTop: 8 }}>
          {error}
        </div>
      ) : null}

      <div className="grid">
        {ports.map((p) => {
          const t = tunnelsByPort.get(p.port);
          const isBusy = !!busy[p.port];
          return (
            <div key={p.port} className="card">
              <div>
                <div className="mono">
                  {p.protocol.toUpperCase()} : {p.port}
                </div>
                <div className="muted mono">pid: {p.pid}</div>
              </div>
              <div>
                <div className="muted">{p.command || "unknown process"}</div>
                {t ? (
                  <div style={{ marginTop: 6 }}>
                    <span className="pill mono">{t.provider}</span>{" "}
                    <span className="mono">{t.url}</span>
                    <div className="muted">renewed: {fmtTime(t.last_renewed_at_ms)}</div>
                  </div>
                ) : (
                  <div className="muted">not shared</div>
                )}
              </div>
              <div className="actions">
                {t ? (
                  <>
                    <button onClick={() => onCopy(t.url)} disabled={isBusy}>
                      Copy
                    </button>
                    <button onClick={() => onRenew(p.port)} disabled={isBusy}>
                      Renew
                    </button>
                    <button onClick={() => onClose(p.port)} disabled={isBusy}>
                      Close
                    </button>
                  </>
                ) : (
                  <button onClick={() => onOpen(p.port)} className="primary" disabled={isBusy}>
                    Share
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

