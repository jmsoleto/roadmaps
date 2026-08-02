//! SQLite persistence: versioned schema, migrations, and full load/save of the
//! roadmap data model. Dates are stored as absolute ISO `YYYY-MM-DD` strings
//! (design decision D2). The whole `AppData` is serialized to/from the same
//! shape the TypeScript frontend uses (camelCase JSON via serde rename).

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

/// Latest schema version this build knows how to produce.
const LATEST_VERSION: i64 = 1;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Assignee {
    pub id: String,
    pub name: String,
    /// Palette slot, carried as text. See the note on `Phase::color_slot`.
    pub color_slot: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub label: String,
    /// Palette slot, carried as text. See the note on `Phase::color_slot`.
    pub color_slot: String,
    pub start_date: String,
    pub end_date: String,
    pub assignee_id: Option<String>,
    pub notes: String,
    pub depends_on: Vec<String>,
    pub is_milestone: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Phase {
    pub id: String,
    pub name: String,
    /// Index into the active theme's bar palette.
    ///
    /// Carried as text, and stored in the pre-existing `color` column, so no
    /// schema migration is needed. It stays a `String` rather than an integer
    /// on purpose: rows written before theming hold a hex color, and passing
    /// that value through untouched lets the frontend map it to the nearest
    /// slot, where the palette and the color math already live.
    pub color_slot: String,
    pub expanded: bool,
    pub assignee_id: Option<String>,
    pub notes: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub children: Vec<Item>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Roadmap {
    pub id: String,
    pub name: String,
    pub start_date: String,
    pub window_days: i64,
    pub rows: Vec<Phase>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppData {
    pub roadmaps: Vec<Roadmap>,
    pub assignees: Vec<Assignee>,
    pub active_id: Option<String>,
}

/// Open the database at `path`, creating and migrating the schema as needed.
pub fn open(path: &std::path::Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
    migrate(&conn)?;
    Ok(conn)
}

/// Read the current schema version, applying any pending migrations in order.
fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)",
        [],
    )?;
    let current: Option<i64> = conn
        .query_row("SELECT version FROM schema_version LIMIT 1", [], |r| r.get(0))
        .ok();

    let mut version = match current {
        Some(v) => v,
        None => {
            conn.execute("INSERT INTO schema_version (version) VALUES (0)", [])?;
            0
        }
    };

    while version < LATEST_VERSION {
        version += 1;
        apply_migration(conn, version)?;
        conn.execute("UPDATE schema_version SET version = ?1", params![version])?;
    }
    Ok(())
}

/// Apply the migration that upgrades the schema to `version`.
fn apply_migration(conn: &Connection, version: i64) -> rusqlite::Result<()> {
    match version {
        1 => conn.execute_batch(
            "
            CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE assignees (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL, ord INTEGER NOT NULL);
            CREATE TABLE roadmaps (id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date TEXT NOT NULL, window_days INTEGER NOT NULL, ord INTEGER NOT NULL);
            CREATE TABLE phases (
                id TEXT PRIMARY KEY, roadmap_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL,
                expanded INTEGER NOT NULL, assignee_id TEXT, notes TEXT NOT NULL,
                start_date TEXT, end_date TEXT, ord INTEGER NOT NULL,
                FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE
            );
            CREATE TABLE items (
                id TEXT PRIMARY KEY, phase_id TEXT NOT NULL, label TEXT NOT NULL, color TEXT NOT NULL,
                start_date TEXT NOT NULL, end_date TEXT NOT NULL, assignee_id TEXT, notes TEXT NOT NULL,
                is_milestone INTEGER NOT NULL, ord INTEGER NOT NULL,
                FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
            );
            CREATE TABLE dependencies (
                item_id TEXT NOT NULL, depends_on_item_id TEXT NOT NULL,
                PRIMARY KEY (item_id, depends_on_item_id),
                FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
            );
            ",
        ),
        _ => Ok(()),
    }
}

/// Load the full app data, or `None` if the database has no roadmaps yet
/// (so the frontend can seed initial content on first run).
pub fn load(conn: &Connection) -> rusqlite::Result<Option<AppData>> {
    let mut assignees = Vec::new();
    {
        let mut stmt = conn.prepare("SELECT id, name, color FROM assignees ORDER BY ord")?;
        let rows = stmt.query_map([], |r| {
            Ok(Assignee {
                id: r.get(0)?,
                name: r.get(1)?,
                color_slot: r.get(2)?,
            })
        })?;
        for a in rows {
            assignees.push(a?);
        }
    }

    let mut roadmaps = Vec::new();
    {
        let mut stmt =
            conn.prepare("SELECT id, name, start_date, window_days FROM roadmaps ORDER BY ord")?;
        let rows = stmt.query_map([], |r| {
            Ok(Roadmap {
                id: r.get(0)?,
                name: r.get(1)?,
                start_date: r.get(2)?,
                window_days: r.get(3)?,
                rows: Vec::new(),
            })
        })?;
        for rm in rows {
            roadmaps.push(rm?);
        }
    }

    if roadmaps.is_empty() && assignees.is_empty() {
        return Ok(None);
    }

    for rm in roadmaps.iter_mut() {
        let mut stmt = conn.prepare(
            "SELECT id, name, color, expanded, assignee_id, notes, start_date, end_date
             FROM phases WHERE roadmap_id = ?1 ORDER BY ord",
        )?;
        let phases = stmt.query_map(params![rm.id], |r| {
            Ok(Phase {
                id: r.get(0)?,
                name: r.get(1)?,
                color_slot: r.get(2)?,
                expanded: r.get::<_, i64>(3)? != 0,
                assignee_id: r.get(4)?,
                notes: r.get(5)?,
                start_date: r.get(6)?,
                end_date: r.get(7)?,
                children: Vec::new(),
            })
        })?;
        let mut collected: Vec<Phase> = Vec::new();
        for p in phases {
            collected.push(p?);
        }
        for phase in collected.iter_mut() {
            let mut istmt = conn.prepare(
                "SELECT id, label, color, start_date, end_date, assignee_id, notes, is_milestone
                 FROM items WHERE phase_id = ?1 ORDER BY ord",
            )?;
            let items = istmt.query_map(params![phase.id], |r| {
                Ok(Item {
                    id: r.get(0)?,
                    label: r.get(1)?,
                    color_slot: r.get(2)?,
                    start_date: r.get(3)?,
                    end_date: r.get(4)?,
                    assignee_id: r.get(5)?,
                    notes: r.get(6)?,
                    depends_on: Vec::new(),
                    is_milestone: r.get::<_, i64>(7)? != 0,
                })
            })?;
            for it in items {
                let mut item = it?;
                let mut dstmt = conn
                    .prepare("SELECT depends_on_item_id FROM dependencies WHERE item_id = ?1")?;
                let deps = dstmt.query_map(params![item.id], |r| r.get::<_, String>(0))?;
                for d in deps {
                    item.depends_on.push(d?);
                }
                phase.children.push(item);
            }
        }
        rm.rows = collected;
    }

    let active_id: Option<String> = conn
        .query_row(
            "SELECT value FROM app_state WHERE key = 'active_id'",
            [],
            |r| r.get(0),
        )
        .ok();

    Ok(Some(AppData {
        roadmaps,
        assignees,
        active_id,
    }))
}

/// Replace the entire dataset in a single transaction (full-snapshot save).
pub fn save(conn: &mut Connection, data: &AppData) -> rusqlite::Result<()> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM dependencies", [])?;
    tx.execute("DELETE FROM items", [])?;
    tx.execute("DELETE FROM phases", [])?;
    tx.execute("DELETE FROM roadmaps", [])?;
    tx.execute("DELETE FROM assignees", [])?;

    for (i, a) in data.assignees.iter().enumerate() {
        tx.execute(
            "INSERT INTO assignees (id, name, color, ord) VALUES (?1, ?2, ?3, ?4)",
            params![a.id, a.name, a.color_slot, i as i64],
        )?;
    }

    for (ri, rm) in data.roadmaps.iter().enumerate() {
        tx.execute(
            "INSERT INTO roadmaps (id, name, start_date, window_days, ord) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![rm.id, rm.name, rm.start_date, rm.window_days, ri as i64],
        )?;
        for (pi, p) in rm.rows.iter().enumerate() {
            tx.execute(
                "INSERT INTO phases (id, roadmap_id, name, color, expanded, assignee_id, notes, start_date, end_date, ord)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    p.id, rm.id, p.name, p.color_slot, p.expanded as i64,
                    p.assignee_id, p.notes, p.start_date, p.end_date, pi as i64
                ],
            )?;
            for (ii, it) in p.children.iter().enumerate() {
                tx.execute(
                    "INSERT INTO items (id, phase_id, label, color, start_date, end_date, assignee_id, notes, is_milestone, ord)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![
                        it.id, p.id, it.label, it.color_slot, it.start_date, it.end_date,
                        it.assignee_id, it.notes, it.is_milestone as i64, ii as i64
                    ],
                )?;
                for dep in it.depends_on.iter() {
                    tx.execute(
                        "INSERT OR IGNORE INTO dependencies (item_id, depends_on_item_id) VALUES (?1, ?2)",
                        params![it.id, dep],
                    )?;
                }
            }
        }
    }

    set_pref_tx(&tx, "active_id", data.active_id.as_deref())?;
    tx.commit()
}

fn set_pref_tx(
    tx: &rusqlite::Transaction,
    key: &str,
    value: Option<&str>,
) -> rusqlite::Result<()> {
    match value {
        Some(v) => tx.execute(
            "INSERT INTO app_state (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, v],
        )?,
        None => tx.execute("DELETE FROM app_state WHERE key = ?1", params![key])?,
    };
    Ok(())
}

/// Read a UI preference (e.g. zoom level) from `app_state`.
pub fn get_pref(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM app_state WHERE key = ?1",
        params![key],
        |r| r.get(0),
    )
    .ok()
}

/// Write a UI preference to `app_state`.
pub fn set_pref(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO app_state (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn conn() -> Connection {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrate(&c).unwrap();
        c
    }

    #[test]
    fn migrate_sets_latest_version() {
        let c = conn();
        let v: i64 = c
            .query_row("SELECT version FROM schema_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(v, LATEST_VERSION);
    }

    #[test]
    fn empty_db_loads_none() {
        let c = conn();
        assert!(load(&c).unwrap().is_none());
    }

    #[test]
    fn save_then_load_round_trips_with_deps_and_assignees() {
        let mut c = conn();
        let data = AppData {
            roadmaps: vec![Roadmap {
                id: "rm1".into(),
                name: "Demo".into(),
                start_date: "2026-01-01".into(),
                window_days: 730,
                rows: vec![Phase {
                    id: "p1".into(),
                    name: "Fase".into(),
                    color_slot: "0".into(),
                    expanded: true,
                    assignee_id: None,
                    notes: String::new(),
                    start_date: None,
                    end_date: None,
                    children: vec![
                        Item {
                            id: "i1".into(),
                            label: "A".into(),
                            color_slot: "0".into(),
                            start_date: "2026-01-05".into(),
                            end_date: "2026-01-20".into(),
                            assignee_id: Some("as1".into()),
                            notes: "n".into(),
                            depends_on: vec![],
                            is_milestone: false,
                        },
                        Item {
                            id: "i2".into(),
                            label: "B".into(),
                            color_slot: "0".into(),
                            start_date: "2026-01-21".into(),
                            end_date: "2026-02-10".into(),
                            assignee_id: None,
                            notes: String::new(),
                            depends_on: vec!["i1".into()],
                            is_milestone: false,
                        },
                    ],
                }],
            }],
            assignees: vec![Assignee {
                id: "as1".into(),
                name: "Ana".into(),
                color_slot: "3".into(),
            }],
            active_id: Some("rm1".into()),
        };

        save(&mut c, &data).unwrap();
        let back = load(&c).unwrap().expect("data present");

        assert_eq!(back.roadmaps.len(), 1);
        assert_eq!(back.active_id.as_deref(), Some("rm1"));
        assert_eq!(back.assignees.len(), 1);
        let items = &back.roadmaps[0].rows[0].children;
        assert_eq!(items.len(), 2);
        assert_eq!(items[1].depends_on, vec!["i1".to_string()]);
        assert_eq!(items[0].assignee_id.as_deref(), Some("as1"));
        assert_eq!(items[0].start_date, "2026-01-05");
    }

    #[test]
    fn save_is_idempotent_replace() {
        let mut c = conn();
        let data = AppData {
            roadmaps: vec![],
            assignees: vec![Assignee {
                id: "a".into(),
                name: "X".into(),
                color_slot: "0".into(),
            }],
            active_id: None,
        };
        save(&mut c, &data).unwrap();
        save(&mut c, &data).unwrap(); // second save must not duplicate rows
        let n: i64 = c
            .query_row("SELECT COUNT(*) FROM assignees", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 1);
    }
}
