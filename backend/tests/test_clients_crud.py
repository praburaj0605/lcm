def test_clients_crud_flow(client, auth_headers):
    r = client.post("/api/clients", headers=auth_headers, json={"companyName": "Acme", "email": "a@acme.com"})
    assert r.status_code == 201
    created = r.json()
    cid = created["id"]
    assert created.get("companyName") == "Acme"

    r = client.get("/api/clients", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.get(f"/api/clients/{cid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == cid

    r = client.put(
        f"/api/clients/{cid}",
        headers=auth_headers,
        json={"companyName": "Acme Ltd", "email": "a@acme.com"},
    )
    assert r.status_code == 200
    assert r.json()["companyName"] == "Acme Ltd"

    r = client.delete(f"/api/clients/{cid}", headers=auth_headers)
    assert r.status_code == 204

    r = client.get(f"/api/clients/{cid}", headers=auth_headers)
    assert r.status_code == 404


def test_get_client_404(client, auth_headers):
    r = client.get("/api/clients/does-not-exist", headers=auth_headers)
    assert r.status_code == 404


def test_delete_client_404(client, auth_headers):
    r = client.delete("/api/clients/missing-id", headers=auth_headers)
    assert r.status_code == 404
