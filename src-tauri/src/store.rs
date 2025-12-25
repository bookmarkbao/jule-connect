use std::{
    fs,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("lock failed")]
    LockFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesiredTunnel {
    pub port: u16,
    pub provider: String,
    pub updated_at_ms: u64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct StoreData {
    pub desired_tunnels: Vec<DesiredTunnel>,
}

pub struct Store {
    path: PathBuf,
    data: Mutex<StoreData>,
}

impl Store {
    pub fn load(app: &AppHandle) -> Result<Self, StoreError> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
        fs::create_dir_all(&dir)?;
        let path = dir.join("state.json");

        let data = if path.exists() {
            let raw = fs::read_to_string(&path)?;
            serde_json::from_str(&raw)?
        } else {
            StoreData::default()
        };

        Ok(Self {
            path,
            data: Mutex::new(data),
        })
    }

    pub fn desired_tunnels(&self) -> Vec<DesiredTunnel> {
        let guard = match self.data.lock() {
            Ok(g) => g,
            Err(_) => return vec![],
        };
        guard.desired_tunnels.clone()
    }

    pub fn enable_desired_tunnel(&self, mut t: DesiredTunnel) -> Result<(), StoreError> {
        t.updated_at_ms = now_ms();
        let mut guard = self.data.lock().map_err(|_| StoreError::LockFailed)?;
        guard.desired_tunnels.retain(|x| x.port != t.port);
        guard.desired_tunnels.push(t);
        drop(guard);
        self.persist()
    }

    pub fn disable_desired_tunnel(&self, port: u16) -> Result<(), StoreError> {
        let mut guard = self.data.lock().map_err(|_| StoreError::LockFailed)?;
        guard.desired_tunnels.retain(|x| x.port != port);
        drop(guard);
        self.persist()
    }

    pub fn touch_desired_tunnel(&self, port: u16) -> Result<(), StoreError> {
        let mut guard = self.data.lock().map_err(|_| StoreError::LockFailed)?;
        for x in &mut guard.desired_tunnels {
            if x.port == port {
                x.updated_at_ms = now_ms();
            }
        }
        drop(guard);
        self.persist()
    }

    fn persist(&self) -> Result<(), StoreError> {
        let guard = self.data.lock().map_err(|_| StoreError::LockFailed)?;
        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, serde_json::to_vec_pretty(&*guard)?)?;
        fs::rename(&tmp, &self.path)?;
        Ok(())
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
