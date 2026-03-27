import os

import aiosqlite
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).parent / "qlean.db"))


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("""
            CREATE TABLE IF NOT EXISTS filters (
                filter_id TEXT PRIMARY KEY,
                measurement_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                filter_info TEXT,
                error_message TEXT
            )
        """)
        await db.commit()


async def create_filter(filter_id: str, measurement_id: str, created_at: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO filters (filter_id, measurement_id, status, created_at, updated_at) VALUES (?, ?, 'Pending', ?, ?)",
            (filter_id, measurement_id, created_at, created_at),
        )
        await db.commit()


async def update_filter_status(filter_id: str, status: str, updated_at: str,
                                filter_info: str | None = None,
                                error_message: str | None = None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE filters SET status=?, updated_at=?, filter_info=?, error_message=? WHERE filter_id=?",
            (status, updated_at, filter_info, error_message, filter_id),
        )
        await db.commit()


async def get_filter(filter_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM filters WHERE filter_id=?", (filter_id,))
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


# --- Synchronous helpers for use in ProcessPoolExecutor (separate process) ---

def sync_update_filter_status(filter_id: str, status: str, updated_at: str,
                               filter_info: str | None = None,
                               error_message: str | None = None) -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        "UPDATE filters SET status=?, updated_at=?, filter_info=?, error_message=? WHERE filter_id=?",
        (status, updated_at, filter_info, error_message, filter_id),
    )
    conn.commit()
    conn.close()


