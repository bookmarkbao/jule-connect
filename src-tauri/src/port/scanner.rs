use std::collections::HashMap;
use std::process::Command;

use thiserror::Error;

use crate::port::PortInfo;

#[derive(Debug, Error)]
pub enum ScanError {
    #[error("command failed: {0}")]
    CommandFailed(String),
}

pub fn scan_listening_ports() -> Result<Vec<PortInfo>, ScanError> {
    if cfg!(target_os = "windows") {
        scan_windows()
    } else {
        scan_unix()
    }
}

fn scan_unix() -> Result<Vec<PortInfo>, ScanError> {
    let out = Command::new("lsof")
        .args(["-iTCP", "-sTCP:LISTEN", "-P", "-n"])
        .output()
        .map_err(|e| ScanError::CommandFailed(e.to_string()))?;

    if !out.status.success() {
        return Err(ScanError::CommandFailed(
            String::from_utf8_lossy(&out.stderr).to_string(),
        ));
    }

    let s = String::from_utf8_lossy(&out.stdout);
    let mut by_port: HashMap<u16, PortInfo> = HashMap::new();

    for (idx, line) in s.lines().enumerate() {
        if idx == 0 {
            continue;
        }

        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 9 {
            continue;
        }

        let command = cols[0].to_string();
        let pid: u32 = match cols[1].parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        let name = cols[8];
        let port = parse_port_from_name(name);
        if let Some(port) = port {
            by_port.entry(port).or_insert_with(|| PortInfo {
                port,
                pid,
                protocol: "tcp".to_string(),
                command: Some(command.clone()),
            });
        }
    }

    let mut out: Vec<PortInfo> = by_port.into_values().collect();
    out.sort_by_key(|p| p.port);
    Ok(out)
}

fn scan_windows() -> Result<Vec<PortInfo>, ScanError> {
    let out = Command::new("netstat")
        .args(["-ano", "-p", "tcp"])
        .output()
        .map_err(|e| ScanError::CommandFailed(e.to_string()))?;

    if !out.status.success() {
        return Err(ScanError::CommandFailed(
            String::from_utf8_lossy(&out.stderr).to_string(),
        ));
    }

    let s = String::from_utf8_lossy(&out.stdout);
    let mut by_port: HashMap<u16, PortInfo> = HashMap::new();

    for line in s.lines() {
        let line = line.trim();
        if !line.starts_with("TCP") {
            continue;
        }

        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 5 {
            continue;
        }
        if cols[3] != "LISTENING" {
            continue;
        }

        let local = cols[1];
        let pid: u32 = match cols[4].parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        let port = parse_port_from_local(local);
        if let Some(port) = port {
            by_port.entry(port).or_insert_with(|| PortInfo {
                port,
                pid,
                protocol: "tcp".to_string(),
                command: None,
            });
        }
    }

    let mut out: Vec<PortInfo> = by_port.into_values().collect();
    out.sort_by_key(|p| p.port);
    Ok(out)
}

fn parse_port_from_local(local: &str) -> Option<u16> {
    let idx = local.rfind(':')?;
    local[idx + 1..].parse().ok()
}

fn parse_port_from_name(name: &str) -> Option<u16> {
    let idx = name.rfind(':')?;
    let after = &name[idx + 1..];
    let port_str: String = after.chars().take_while(|c| c.is_ascii_digit()).collect();
    if port_str.is_empty() {
        return None;
    }
    port_str.parse().ok()
}
