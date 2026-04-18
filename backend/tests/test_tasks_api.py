from __future__ import annotations


def test_list_tasks_initially_empty(client):
    res = client.get("/api/tasks")
    assert res.status_code == 200
    assert res.get_json() == []


def test_create_task_and_list(client):
    res = client.post("/api/tasks", json={"text": "Buy milk"})
    assert res.status_code == 201
    task = res.get_json()
    assert task["text"] == "Buy milk"
    assert task["completed"] is False
    assert isinstance(task["createdAt"], int)
    assert isinstance(task["id"], str) and task["id"]

    res2 = client.get("/api/tasks")
    assert res2.status_code == 200
    tasks = res2.get_json()
    assert [t["id"] for t in tasks] == [task["id"]]


def test_create_task_requires_text(client):
    res = client.post("/api/tasks", json={"text": "   "})
    assert res.status_code == 400
    payload = res.get_json()
    assert payload["code"] == 400


def test_update_task_text_put(client):
    created = client.post("/api/tasks", json={"text": "Old"}).get_json()

    res = client.put(f"/api/tasks/{created['id']}", json={"text": "New"})
    assert res.status_code == 200
    updated = res.get_json()
    assert updated["id"] == created["id"]
    assert updated["text"] == "New"
    assert updated["completed"] is False


def test_patch_requires_completed_field(client):
    created = client.post("/api/tasks", json={"text": "X"}).get_json()
    res = client.patch(f"/api/tasks/{created['id']}", json={})
    assert res.status_code == 400
    payload = res.get_json()
    assert payload["code"] == 400


def test_patch_completed_toggles(client):
    created = client.post("/api/tasks", json={"text": "X"}).get_json()

    res1 = client.patch(f"/api/tasks/{created['id']}", json={"completed": True})
    assert res1.status_code == 200
    assert res1.get_json()["completed"] is True

    res2 = client.patch(f"/api/tasks/{created['id']}", json={"completed": False})
    assert res2.status_code == 200
    assert res2.get_json()["completed"] is False


def test_delete_task_and_404(client):
    created = client.post("/api/tasks", json={"text": "X"}).get_json()

    res1 = client.delete(f"/api/tasks/{created['id']}")
    assert res1.status_code == 204
    assert res1.data in (b"", None)

    res2 = client.delete(f"/api/tasks/{created['id']}")
    assert res2.status_code == 404


def test_clear_completed_removes_only_completed(client):
    t1 = client.post("/api/tasks", json={"text": "A"}).get_json()
    t2 = client.post("/api/tasks", json={"text": "B"}).get_json()
    t3 = client.post("/api/tasks", json={"text": "C"}).get_json()

    client.patch(f"/api/tasks/{t1['id']}", json={"completed": True})
    client.patch(f"/api/tasks/{t3['id']}", json={"completed": True})

    res = client.delete("/api/tasks/completed")
    assert res.status_code == 200
    assert res.get_json()["removed"] == 2

    remaining = client.get("/api/tasks").get_json()
    assert [t["id"] for t in remaining] == [t2["id"]]

