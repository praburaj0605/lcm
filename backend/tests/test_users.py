def test_list_users_requires_auth(client):
    r = client.get("/api/users")
    assert r.status_code == 401


def test_list_users_returns_seeded(client, auth_headers):
    r = client.get("/api/users", headers=auth_headers)
    assert r.status_code == 200
    users = r.json()
    emails = {u["email"] for u in users}
    assert "admin@test.com" in emails
    assert "sales@test.com" in emails
