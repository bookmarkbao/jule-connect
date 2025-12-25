use std::{
    collections::HashMap,
    process::Child,
    time::{SystemTime, UNIX_EPOCH},
};

use super::{
    cloudflare::CloudflareProvider,
    provider::{TunnelError, TunnelProvider},
    TunnelInfo,
};

struct ActiveTunnel {
    child: Child,
    info: TunnelInfo,
}

pub struct TunnelManager {
    provider: Box<dyn TunnelProvider>,
    active: HashMap<u16, ActiveTunnel>,
}

impl TunnelManager {
    pub fn new() -> Self {
        Self {
            provider: Box::new(CloudflareProvider::default()),
            active: HashMap::new(),
        }
    }

    pub fn list(&self) -> Vec<TunnelInfo> {
        let mut v: Vec<TunnelInfo> = self.active.values().map(|t| t.info.clone()).collect();
        v.sort_by_key(|x| x.port);
        v
    }

    pub fn start(&mut self, port: u16) -> Result<TunnelInfo, TunnelError> {
        if self.active.contains_key(&port) {
            return Ok(self.active.get(&port).unwrap().info.clone());
        }
        let (child, url) = self.provider.start(port)?;
        let info = self.provider.build_info(port, url);
        self.active.insert(
            port,
            ActiveTunnel {
                child,
                info: info.clone(),
            },
        );
        Ok(info)
    }

    pub fn stop(&mut self, port: u16) -> Result<(), TunnelError> {
        let mut t = self.active.remove(&port).ok_or(TunnelError::NotRunning)?;
        self.provider.stop(&mut t.child)?;
        Ok(())
    }

    pub fn renew(&mut self, port: u16) -> Result<TunnelInfo, TunnelError> {
        if self.active.contains_key(&port) {
            let _ = self.stop(port);
        }
        let (child, url) = self.provider.start(port)?;
        let mut info = self.provider.build_info(port, url);
        info.last_renewed_at_ms = now_ms();
        self.active.insert(
            port,
            ActiveTunnel {
                child,
                info: info.clone(),
            },
        );
        Ok(info)
    }

    pub fn take_dead_ports(&mut self) -> Vec<u16> {
        let mut dead = vec![];
        let mut still = HashMap::new();
        for (port, mut t) in self.active.drain() {
            match t.child.try_wait() {
                Ok(Some(_)) => dead.push(port),
                Ok(None) => {
                    still.insert(port, t);
                }
                Err(_) => dead.push(port),
            }
        }
        self.active = still;
        dead
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
