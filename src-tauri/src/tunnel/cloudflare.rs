use std::{
    io::{BufRead, BufReader},
    process::{Child, Command, Stdio},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use regex::Regex;

use super::{provider::TunnelError, provider::TunnelProvider, TunnelInfo};

pub struct CloudflareProvider {
    pub binary: String,
}

impl Default for CloudflareProvider {
    fn default() -> Self {
        Self {
            binary: "cloudflared".to_string(),
        }
    }
}

fn resolve_cloudflared_binary(configured: &str) -> Option<String> {
    // 1) Explicit path in config
    if looks_like_path(configured) && Path::new(configured).exists() {
        return Some(configured.to_string());
    }

    // 2) Env override
    if let Ok(p) = std::env::var("CLOUDFLARED_PATH") {
        if !p.trim().is_empty() && Path::new(&p).exists() {
            return Some(p);
        }
    }

    // 3) Sidecar next to executable (Tauri externalBin pattern)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            for name in candidate_names() {
                let p = dir.join(name);
                if p.exists() {
                    return Some(p.to_string_lossy().to_string());
                }
            }

            // 4) macOS app bundle Resources directory
            // <App>.app/Contents/MacOS/<exe> -> Resources at ../Resources
            if cfg!(target_os = "macos") {
                if let Some(contents) = dir.parent() {
                    let resources = contents.join("Resources");
                    for name in candidate_names() {
                        let p = resources.join(name);
                        if p.exists() {
                            return Some(p.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    // 5) Common system install locations (packaged apps often don't inherit shell PATH)
    for p in common_locations() {
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
    }

    None
}

fn looks_like_path(s: &str) -> bool {
    s.contains('/') || s.contains('\\')
}

fn candidate_names() -> Vec<&'static str> {
    if cfg!(target_os = "windows") {
        vec!["cloudflared.exe", "cloudflared"]
    } else {
        vec!["cloudflared"]
    }
}

fn common_locations() -> Vec<PathBuf> {
    if cfg!(target_os = "macos") {
        return vec![
            PathBuf::from("/opt/homebrew/bin/cloudflared"),
            PathBuf::from("/usr/local/bin/cloudflared"),
            PathBuf::from("/usr/bin/cloudflared"),
        ];
    }

    if cfg!(target_os = "windows") {
        let mut out = vec![
            PathBuf::from(r"C:\ProgramData\chocolatey\bin\cloudflared.exe"),
        ];
        for var in ["ProgramFiles", "ProgramFiles(x86)", "LocalAppData"] {
            if let Ok(root) = std::env::var(var) {
                out.push(PathBuf::from(&root).join("Cloudflare").join("cloudflared.exe"));
                out.push(PathBuf::from(&root).join("cloudflared").join("cloudflared.exe"));
            }
        }
        return out;
    }

    vec![
        PathBuf::from("/usr/local/bin/cloudflared"),
        PathBuf::from("/usr/bin/cloudflared"),
        PathBuf::from("/snap/bin/cloudflared"),
    ]
}

impl TunnelProvider for CloudflareProvider {
    fn name(&self) -> &'static str {
        "cloudflare"
    }

    fn start(&self, port: u16) -> Result<(Child, String), TunnelError> {
        let bin = resolve_cloudflared_binary(&self.binary).unwrap_or_else(|| self.binary.clone());

        let mut child = Command::new(&bin)
            .args([
                "tunnel",
                "--url",
                &format!("http://localhost:{port}"),
                "--no-autoupdate",
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                if e.kind() == std::io::ErrorKind::NotFound {
                    TunnelError::StartFailed(format!(
                        "cloudflared not found. Install it and ensure it's accessible to the app, or set CLOUDFLARED_PATH.\nTried binary: {bin}"
                    ))
                } else {
                    TunnelError::StartFailed(format!("cloudflared failed to start: {e}"))
                }
            })?;

        let url_slot: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
        let found = Arc::new(AtomicBool::new(false));
        let re = Regex::new(r"https?://[A-Za-z0-9.-]+\.trycloudflare\.com").unwrap();

        if let Some(stdout) = child.stdout.take() {
            spawn_reader(stdout, re.clone(), url_slot.clone(), found.clone());
        }
        if let Some(stderr) = child.stderr.take() {
            spawn_reader(stderr, re.clone(), url_slot.clone(), found.clone());
        }

        let start = SystemTime::now();
        loop {
            if found.load(Ordering::SeqCst) {
                let url = url_slot.lock().ok().and_then(|x| x.clone());
                if let Some(url) = url {
                    return Ok((child, url));
                }
            }
            if start.elapsed().unwrap_or_default() > Duration::from_secs(20) {
                let _ = child.kill();
                let _ = child.wait();
                return Err(TunnelError::UrlTimeout);
            }
            thread::sleep(Duration::from_millis(80));
        }
    }

    fn stop(&self, child: &mut Child) -> Result<(), TunnelError> {
        child
            .kill()
            .map_err(|e| TunnelError::StopFailed(e.to_string()))?;
        let _ = child.wait();
        Ok(())
    }

    fn build_info(&self, port: u16, url: String) -> TunnelInfo {
        let now = now_ms();
        TunnelInfo {
            port,
            provider: self.name().to_string(),
            url,
            started_at_ms: now,
            last_renewed_at_ms: now,
        }
    }
}

fn spawn_reader<R: std::io::Read + Send + 'static>(
    reader: R,
    re: Regex,
    url_slot: Arc<Mutex<Option<String>>>,
    found: Arc<AtomicBool>,
) {
    thread::spawn(move || {
        let buf = BufReader::new(reader);
        for line in buf.lines().flatten() {
            if found.load(Ordering::SeqCst) {
                continue;
            }
            if let Some(m) = re.find(&line) {
                if let Ok(mut slot) = url_slot.lock() {
                    if slot.is_none() {
                        *slot = Some(m.as_str().to_string());
                        found.store(true, Ordering::SeqCst);
                    }
                }
            }
        }
    });
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
