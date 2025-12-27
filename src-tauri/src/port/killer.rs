use std::{path::Path, process::Command, thread, time::Duration};

use thiserror::Error;

#[derive(Debug, Error)]
pub enum KillError {
    #[error("invalid pid")]
    InvalidPid,

    #[error("command failed: {0}")]
    CommandFailed(String),
}

fn first_existing<'a>(candidates: &'a [&'a str]) -> Option<&'a str> {
    candidates.iter().copied().find(|p| Path::new(p).exists())
}

fn is_no_such_process(stderr: &str) -> bool {
    // macOS/Linux kill(1) typically emits: "No such process"
    // when the PID already exited between scan and kill.
    stderr.contains("No such process")
}

fn kill_once(kill_cmd: &str, signal: &str, pid: u32) -> Result<(), KillError> {
    let out = Command::new(kill_cmd)
        .args([signal, &pid.to_string()])
        .output()
        .map_err(|e| KillError::CommandFailed(format!("{kill_cmd}: {e}")))?;

    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr).to_string();
        if is_no_such_process(&stderr) {
            return Ok(());
        }
        return Err(KillError::CommandFailed(stderr));
    }

    Ok(())
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

    // In packaged GUI apps, PATH can be minimal/unexpected. Prefer absolute paths.
    let kill_cmd = first_existing(&["/bin/kill", "/usr/bin/kill"]).unwrap_or("kill");

    if !force {
        return kill_once(kill_cmd, "-15", pid);
    }

    // Match the behavior of common port-killer tools: SIGTERM first, then SIGKILL.
    let _ = kill_once(kill_cmd, "-15", pid);
    thread::sleep(Duration::from_millis(500));
    kill_once(kill_cmd, "-9", pid)
}
