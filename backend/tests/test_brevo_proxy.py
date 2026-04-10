import httpx
import pytest
import respx


@respx.mock
def test_brevo_proxy_success(client, auth_headers):
    route = respx.post("https://api.brevo.com/v3/smtp/email").mock(
        return_value=httpx.Response(201, json={"messageId": "mid-1"})
    )
    payload = {
        "sender": {"email": "a@test.com", "name": "A"},
        "to": [{"email": "b@test.com"}],
        "subject": "Hi",
        "htmlContent": "<p>x</p>",
    }
    r = client.post("/api/brevo/send", headers=auth_headers, json={"payload": payload})
    # FastAPI returns 200 with JSON body; upstream Brevo may use 201 — we do not forward that code.
    assert r.status_code == 200
    assert r.json()["messageId"] == "mid-1"
    assert route.called
    sent = route.calls.last.request.content.decode()
    assert "b@test.com" in sent


@respx.mock
def test_brevo_proxy_forwards_error(client, auth_headers):
    respx.post("https://api.brevo.com/v3/smtp/email").mock(
        return_value=httpx.Response(400, json={"message": "Invalid"})
    )
    r = client.post(
        "/api/brevo/send",
        headers=auth_headers,
        json={"payload": {"sender": {"email": "a@test.com"}, "to": [{"email": "b@test.com"}]}},
    )
    assert r.status_code == 400


def test_brevo_proxy_requires_auth(client):
    r = client.post("/api/brevo/send", json={"payload": {}})
    assert r.status_code == 401


def test_brevo_proxy_no_api_key(client, auth_headers):
    from unittest.mock import MagicMock, patch

    fake = MagicMock()
    fake.brevo_api_key = ""
    fake.brevo_api_url = "https://api.brevo.com/v3/smtp/email"
    with patch("app.api.brevo.get_settings", return_value=fake):
        r = client.post(
            "/api/brevo/send",
            headers=auth_headers,
            json={"payload": {"sender": {"email": "a@test.com"}, "to": [{"email": "b@test.com"}]}},
        )
    assert r.status_code == 503
    assert "Brevo" in r.json()["detail"]
