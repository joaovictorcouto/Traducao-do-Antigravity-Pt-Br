#![windows_subsystem = "windows"]

use std::env;
use std::fs::File;
use std::io::Read;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{exit, Command};

const PATCH_SIGNATURE: &[u8] = b"__ANTIGRAVITY_PTBR_PATCHED__";
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn find_antigravity_dir() -> Option<PathBuf> {
    if let Ok(custom) = env::var("ANTIGRAVITY_PATH") {
        let p = PathBuf::from(custom);
        if p.join("resources").join("app.asar").exists() {
            return Some(p);
        }
    }

    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        let p = PathBuf::from(local_app_data)
            .join("Programs")
            .join("Antigravity");
        if p.join("resources").join("app.asar").exists() {
            return Some(p);
        }
    }

    if let Ok(prog_files) = env::var("ProgramFiles") {
        let p = PathBuf::from(prog_files).join("Antigravity");
        if p.join("resources").join("app.asar").exists() {
            return Some(p);
        }
    }

    if let Ok(prog_files_x86) = env::var("ProgramFiles(x86)") {
        let p = PathBuf::from(prog_files_x86).join("Antigravity");
        if p.join("resources").join("app.asar").exists() {
            return Some(p);
        }
    }

    // Check adjacent directory
    if let Ok(exe_path) = env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            if parent.join("resources").join("app.asar").exists() {
                return Some(parent.to_path_buf());
            }
            if let Some(grandparent) = parent.parent() {
                if grandparent.join("resources").join("app.asar").exists() {
                    return Some(grandparent.to_path_buf());
                }
            }
        }
    }

    None
}

fn is_patched(asar_path: &Path) -> bool {
    let mut file = match File::open(asar_path) {
        Ok(f) => f,
        Err(_) => return false,
    };

    // Scan the first 2MB or up to file length for fast signature matching
    let mut buffer = vec![0u8; 2 * 1024 * 1024];
    let bytes_read = match file.read(&mut buffer) {
        Ok(n) => n,
        Err(_) => return false,
    };

    if buffer[..bytes_read]
        .windows(PATCH_SIGNATURE.len())
        .any(|w| w == PATCH_SIGNATURE)
    {
        return true;
    }

    // If not found in first 2MB, check full content
    let mut full_content = Vec::new();
    if file.read_to_end(&mut full_content).is_ok() {
        return full_content
            .windows(PATCH_SIGNATURE.len())
            .any(|w| w == PATCH_SIGNATURE);
    }

    false
}

fn find_patcher_script() -> Option<PathBuf> {
    // 1. Check relative to current exe
    if let Ok(exe_path) = env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            // Check ./core/patcher.js
            let p1 = parent.join("core").join("patcher.js");
            if p1.exists() {
                return Some(p1);
            }
            // Check ../core/patcher.js
            if let Some(grandparent) = parent.parent() {
                let p2 = grandparent.join("core").join("patcher.js");
                if p2.exists() {
                    return Some(p2);
                }
            }
        }
    }

    // 2. Check current working directory
    let cwd_p = PathBuf::from("core").join("patcher.js");
    if cwd_p.exists() {
        return Some(cwd_p);
    }

    None
}

fn run_patcher_silently(patcher_script: &Path, install_dir: &Path) {
    let _ = Command::new("node")
        .arg(patcher_script)
        .arg("--path")
        .arg(install_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .status();
}

fn main() {
    let install_dir = match find_antigravity_dir() {
        Some(d) => d,
        None => exit(1),
    };

    let asar_path = install_dir.join("resources").join("app.asar");
    let antigravity_exe = install_dir.join("Antigravity.exe");

    if !is_patched(&asar_path) {
        if let Some(patcher) = find_patcher_script() {
            run_patcher_silently(&patcher, &install_dir);
        }
    }

    // Spawn original Antigravity.exe with pass-through CLI arguments
    let args: Vec<String> = env::args().skip(1).collect();
    let _ = Command::new(&antigravity_exe).args(&args).spawn();

    // Launcher exits immediately; zero RAM/CPU consumption
    exit(0);
}
