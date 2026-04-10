def test_brevo_settings_roundtrip(client, auth_headers):
    r = client.get("/api/settings/brevo", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == {}

    r = client.put(
        "/api/settings/brevo",
        headers=auth_headers,
        json={"senderEmail": "noreply@test.com", "senderName": "Tests"},
    )
    assert r.status_code == 200
    assert r.json()["senderEmail"] == "noreply@test.com"

    r = client.get("/api/settings/brevo", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["senderName"] == "Tests"


def test_ui_settings_roundtrip(client, auth_headers):
    r = client.put("/api/settings/ui", headers=auth_headers, json={"sidebarCollapsed": True})
    assert r.status_code == 200
    r = client.get("/api/settings/ui", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("sidebarCollapsed") is True


def test_email_templates_crud(client, auth_headers):
    r = client.get("/api/email-templates", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []

    r = client.post(
        "/api/email-templates",
        headers=auth_headers,
        json={"id": "tpl_1", "name": "Welcome", "body": "Hi {{recipientName}}"},
    )
    assert r.status_code == 201
    assert r.json()["name"] == "Welcome"

    r = client.get("/api/email-templates", headers=auth_headers)
    assert len(r.json()) == 1

    r = client.put(
        "/api/email-templates/tpl_1",
        headers=auth_headers,
        json={"name": "Welcome!", "body": "Hello"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Welcome!"

    r = client.delete("/api/email-templates/tpl_1", headers=auth_headers)
    assert r.status_code == 204

    r = client.get("/api/email-templates", headers=auth_headers)
    assert r.json() == []


def test_email_template_404(client, auth_headers):
    r = client.put(
        "/api/email-templates/missing",
        headers=auth_headers,
        json={"name": "x"},
    )
    assert r.status_code == 404
