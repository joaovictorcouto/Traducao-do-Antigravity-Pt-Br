#![windows_subsystem = "windows"]

use std::env;
use std::fs::{self, File};
use std::io::Write;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{exit, Command};
use std::ptr;
use std::time::{SystemTime, UNIX_EPOCH};

const CREATE_NO_WINDOW: u32 = 0x08000000;

// Win32 MessageBox constants
const MB_OK: u32 = 0x00000000;
const MB_YESNO: u32 = 0x00000004;
const MB_ICONINFORMATION: u32 = 0x00000040;
const MB_ICONWARNING: u32 = 0x00000030;
const MB_ICONERROR: u32 = 0x00000010;
const MB_ICONQUESTION: u32 = 0x00000020;
const IDYES: i32 = 6;

#[link(name = "user32")]
extern "system" {
    fn MessageBoxW(
        hwnd: *mut std::ffi::c_void,
        lp_text: *const u16,
        lp_caption: *const u16,
        u_type: u32,
    ) -> i32;
}

fn to_wide_str(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn show_msg_box(title: &str, message: &str, flags: u32) -> i32 {
    let wide_title = to_wide_str(title);
    let wide_message = to_wide_str(message);
    unsafe {
        MessageBoxW(
            ptr::null_mut(),
            wide_message.as_ptr(),
            wide_title.as_ptr(),
            flags,
        )
    }
}

// Embedded assets compiled directly into the executable binary
const ENGINE_BUNDLE: &[u8] = include_bytes!("../../dist/installer-engine.bundle.js");
const LAUNCHER_EXE: &[u8] = include_bytes!("../../Antigravity-ptbr.exe");

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

    None
}

fn is_antigravity_running() -> bool {
    let output = Command::new("tasklist")
        .args(&["/FI", "IMAGENAME eq Antigravity.exe", "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        return text.to_lowercase().contains("antigravity.exe");
    }

    false
}

fn kill_antigravity() {
    let _ = Command::new("taskkill")
        .args(&["/F", "/IM", "Antigravity.exe"])
        .creation_flags(CREATE_NO_WINDOW)
        .status();
}

fn main() {
    let app_title = "Instalador da Tradução pt-BR - Antigravity";

    // 1. Initial greeting and confirmation
    let confirm = show_msg_box(
        app_title,
        "Deseja instalar a tradução para Português do Brasil no Google Antigravity?\n\nEste instalador irá configurar o suporte a pt-BR, atualizar a interface e criar os atalhos com o ícone oficial.",
        MB_YESNO | MB_ICONQUESTION,
    );

    if confirm != IDYES {
        exit(0);
    }

    // 2. Discover Antigravity installation
    let install_dir = match find_antigravity_dir() {
        Some(dir) => dir,
        None => {
            show_msg_box(
                app_title,
                "Não foi possível localizar o Google Antigravity instalado neste computador.\n\nCertifique-se de que o aplicativo está instalado antes de rodar o instalador.",
                MB_OK | MB_ICONERROR,
            );
            exit(1);
        }
    };

    let antigravity_exe = install_dir.join("Antigravity.exe");
    if !antigravity_exe.exists() {
        show_msg_box(
            app_title,
            "O executável principal do Antigravity não foi encontrado na pasta de instalação.",
            MB_OK | MB_ICONERROR,
        );
        exit(1);
    }

    // 3. Check if Antigravity is running
    if is_antigravity_running() {
        let close_confirm = show_msg_box(
            app_title,
            "O Antigravity está aberto no momento.\n\nPara aplicar a tradução com segurança, é necessário fechar o aplicativo.\n\nDeseja fechar o Antigravity agora e continuar?",
            MB_YESNO | MB_ICONWARNING,
        );

        if close_confirm == IDYES {
            kill_antigravity();
            std::thread::sleep(std::time::Duration::from_millis(800));
        } else {
            exit(0);
        }
    }

    // 4. Extract embedded engine bundle and launcher to temporary directory
    let temp_ts = match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(d) => d.as_millis(),
        Err(_) => 1000,
    };
    let temp_dir = env::temp_dir().join(format!("AntigravitySetup_{}", temp_ts));
    if let Err(e) = fs::create_dir_all(&temp_dir) {
        show_msg_box(
            app_title,
            &format!("Erro ao criar diretório temporário: {}", e),
            MB_OK | MB_ICONERROR,
        );
        exit(1);
    }

    let bundle_file = temp_dir.join("installer-engine.bundle.js");
    let launcher_file = temp_dir.join("Antigravity-ptbr.exe");

    let write_ok = (|| -> std::io::Result<()> {
        let mut f1 = File::create(&bundle_file)?;
        f1.write_all(ENGINE_BUNDLE)?;
        let mut f2 = File::create(&launcher_file)?;
        f2.write_all(LAUNCHER_EXE)?;
        Ok(())
    })();

    if let Err(e) = write_ok {
        show_msg_box(
            app_title,
            &format!("Erro ao extrair arquivos de instalação: {}", e),
            MB_OK | MB_ICONERROR,
        );
        let _ = fs::remove_dir_all(&temp_dir);
        exit(1);
    }

    // 5. Execute bundled installer using Antigravity's internal Node runtime
    let status = Command::new(&antigravity_exe)
        .env("ELECTRON_RUN_AS_NODE", "1")
        .arg(&bundle_file)
        .arg("--path")
        .arg(&install_dir)
        .arg("--launcher")
        .arg(&launcher_file)
        .creation_flags(CREATE_NO_WINDOW)
        .status();

    // 6. Clean up temp folder
    let _ = fs::remove_dir_all(&temp_dir);

    // 7. Verify result
    match status {
        Ok(s) if s.success() => {
            let launch = show_msg_box(
                app_title,
                "🎉 Tradução instalada com sucesso!\n\nOs atalhos do 'Antigravity (Português)' foram criados na sua Área de Trabalho e no Menu Iniciar.\n\nDeseja abrir o Antigravity em Português agora?",
                MB_YESNO | MB_ICONINFORMATION,
            );

            if launch == IDYES {
                let installed_launcher = install_dir.join("Antigravity-ptbr.exe");
                let run_target = if installed_launcher.exists() {
                    installed_launcher
                } else {
                    antigravity_exe
                };
                let _ = Command::new(run_target).spawn();
            }
            exit(0);
        }
        _ => {
            show_msg_box(
                app_title,
                "Ocorreu uma falha ao aplicar a tradução.\nVerifique se você possui permissões de administrador e tente novamente.",
                MB_OK | MB_ICONERROR,
            );
            exit(1);
        }
    }
}
