use serde::Serialize;

pub mod scanner;

#[derive(Debug, Clone, Serialize)]
pub struct PortInfo {
    pub port: u16,
    pub pid: u32,
    pub protocol: String,
    pub process_name: String,
    pub address: String,
    pub user: String,
    pub fd: String,
    pub command: Option<String>,
    pub is_active: bool,
}
