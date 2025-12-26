use std::process::Command;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum KillError {
    #[error("invalid pid")]
    InvalidPid,

    #[error("command failed: {0}")]
    CommandFailed(String),
}

pub fn kill_pid(pid: u32, force: bool) -> Result<(), KillError> {
    if pid == 0 {
        return Err(KillError::InvalidPid);
    }

    if cfg!(target_os = "windows") {
        let mut args = vec!["/PID".to_string(), pid.to_string(), "/T".to_string()];
        if force {
            args.push("/F".to_string());
        }

        let out = Command::new("taskkill")
            .args(args)
            .output()
            .map_err(|e| KillError::CommandFailed(e.to_string()))?;

        if !out.status.success() {
            return Err(KillError::CommandFailed(
                String::from_utf8_lossy(&out.stderr).to_string(),
            ));
        }

        return Ok(());
    }

    let signal = if force { "-KILL" } else { "-TERM" };
    let out = Command::new("kill")
        .args([signal, &pid.to_string()])
        .output()
        .map_err(|e| KillError::CommandFailed(e.to_string()))?;

    if !out.status.success() {
        return Err(KillError::CommandFailed(
            String::from_utf8_lossy(&out.stderr).to_string(),
        ));
    }

    Ok(())
}

