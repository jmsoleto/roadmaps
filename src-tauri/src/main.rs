// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use db::AppData;
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{Manager, State};

/// App-wide state: the open SQLite connection behind a mutex.
struct AppState {
    db: Mutex<Connection>,
}

#[tauri::command]
fn load_app_data(state: State<AppState>) -> Result<Option<AppData>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::load(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_app_data(state: State<AppState>, data: AppData) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    db::save(&mut conn, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_pref(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    Ok(db::get_pref(&conn, &key))
}

#[tauri::command]
fn set_pref(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    db::set_pref(&conn, &key, &value).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app
                .path()
                .app_data_dir()
                .expect("no app data dir available");
            std::fs::create_dir_all(&dir)?;
            let conn = db::open(&dir.join("roadmaps.db"))?;
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_app_data,
            save_app_data,
            get_pref,
            set_pref
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
