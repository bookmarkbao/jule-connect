use serde::Serialize;

pub mod cloudflare;
pub mod manager;
pub mod provider;

#[derive(Debug, Clone, Serialize)]
pub struct TunnelInfo {
    pub port: u16,
    pub provider: String,
    pub url: String,
    pub started_at_ms: u64,
    pub last_renewed_at_ms: u64,
}
