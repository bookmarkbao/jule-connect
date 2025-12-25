use thiserror::Error;

use super::TunnelInfo;

#[derive(Debug, Error)]
pub enum TunnelError {
    #[error("cloudflared not found or failed to start: {0}")]
    StartFailed(String),
    #[error("tunnel url not detected in time")]
    UrlTimeout,
    #[error("tunnel not running")]
    NotRunning,
    #[error("stop failed: {0}")]
    StopFailed(String),
}

pub trait TunnelProvider: Send + Sync {
    fn name(&self) -> &'static str;
    fn start(&self, port: u16) -> Result<(std::process::Child, String), TunnelError>;
    fn stop(&self, child: &mut std::process::Child) -> Result<(), TunnelError>;
    fn build_info(&self, port: u16, url: String) -> TunnelInfo;
}
