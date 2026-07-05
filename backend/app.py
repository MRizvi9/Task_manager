from __future__ import annotations

import json
import sqlite3
import time
import uuid
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory


app = Flask(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "backend" / "tasks.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);")


def row_to_task(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "text": row["text"],
        "completed": bool(row["completed"]),
        "createdAt": row["created_at"],
    }


@app.after_request
def add_dev_headers(resp):
    # Keep this simple for local development. Since the frontend is served by this same app,
    # CORS isn't strictly necessary, but headers don't hurt.
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return resp


@app.route("/")
def index():
    return send_from_directory(REPO_ROOT, "index.html")


@app.route("/styles.css")
def styles():
    return send_from_directory(REPO_ROOT, "styles.css")


@app.route("/app.js")
def js():
    return send_from_directory(REPO_ROOT, "app.js")


@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY created_at ASC").fetchall()
    return jsonify([row_to_task(r) for r in rows])


@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    if not text:
        abort(400, description="Missing 'text'")

    task_id = str(uuid.uuid4())
    created_at_ms = int(time.time() * 1000)

    with get_conn() as conn:
        conn.execute(
            "INSERT INTO tasks (id, text, completed, created_at) VALUES (?, ?, ?, ?)",
            (task_id, text, 0, created_at_ms),
        )
        conn.commit()

        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return jsonify(row_to_task(row)), 201


@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task_text(task_id: str):
    if not task_id:
        abort(400, description="Missing task id")
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    if not text:
        abort(400, description="Missing 'text'")

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if row is None:
            abort(404)
        conn.execute("UPDATE tasks SET text = ? WHERE id = ?", (text, task_id))
        conn.commit()
        row2 = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return jsonify(row_to_task(row2))


@app.route("/api/tasks/<task_id>", methods=["PATCH"])
def update_task(task_id: str):
    if not task_id:
        abort(400, description="Missing task id")
    data = request.get_json(silent=True) or {}

    if "completed" not in data:
        # Keep strict to avoid accidental silent failures.
        abort(400, description="Missing 'completed'")

    completed = bool(data.get("completed"))

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if row is None:
            abort(404)
        conn.execute("UPDATE tasks SET completed = ? WHERE id = ?", (1 if completed else 0, task_id))
        conn.commit()
        row2 = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return jsonify(row_to_task(row2))


@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id: str):
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
        if cur.rowcount == 0:
            abort(404)
    return ("", 204)


@app.route("/api/tasks/completed", methods=["DELETE"])
def clear_completed():
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM tasks WHERE completed = 1")
        conn.commit()
        removed = int(cur.rowcount or 0)
    return jsonify({"removed": removed}), 200


@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(500)
def handle_error(err):
    # Simple JSON errors for the frontend.
    code = getattr(err, "code", 500)
    message = getattr(err, "description", None) or str(err)
    return jsonify({"error": message, "code": code}), code


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=8080, debug=True)

