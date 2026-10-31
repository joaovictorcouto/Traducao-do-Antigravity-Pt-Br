#[cfg(windows)]
fn main() {
    let mut res = winres::WindowsResource::new();
    res.set_icon("../launcher/app.ico");
    res.set("ProductName", "Instalador Tradução Antigravity pt-BR");
    res.set("FileDescription", "Instalador da Tradução para Português do Brasil do Google Antigravity");
    res.set("LegalCopyright", "Copyright (c) 2026");
    res.set("ProductVersion", "1.0.0.0");
    res.set("FileVersion", "1.0.0.0");
    res.compile().unwrap();
}

#[cfg(not(windows))]
fn main() {}
