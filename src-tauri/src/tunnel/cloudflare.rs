use std::{
    io::{BufRead, BufReader},
    process::{Child, Command, Stdio},
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

impl TunnelProvider for CloudflareProvider {
    fn name(&self) -> &'static str {
        "cloudflare"
    }

    fn start(&self, port: u16) -> Result<(Child, String), TunnelError> {
        let mut child = Command::new(&self.binary)
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
            .map_err(|e| TunnelError::StartFailed(e.to_string()))?;

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
