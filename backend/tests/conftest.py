from __future__ import annotations

import pytest


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """
    Flask test client backed by an isolated temporary SQLite DB per test.
    """
    from backend import app as app_module

    monkeypatch.setattr(app_module, "DB_PATH", tmp_path / "tasks_test.db", raising=True)
    app_module.init_db()

    app_module.app.config.update(TESTING=True)
    with app_module.app.test_client() as c:
        yield c

