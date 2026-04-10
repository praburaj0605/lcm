def test_login_success_admin(client):
    r = client.post("/api/auth/login", json={"email": "admin@test.com"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert len(data["access_token"]) > 20


def test_login_success_sales(client):
    r = client.post("/api/auth/login", json={"email": "sales@test.com"})
    assert r.status_code == 200


def test_login_unknown_email(client):
    r = client.post("/api/auth/login", json={"email": "nobody@example.com"})
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_invalid_token(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert r.status_code == 401


def test_me_ok(client, auth_headers):
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == "admin@test.com"
    assert me["role"] == "admin"
