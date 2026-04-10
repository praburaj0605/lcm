import uuid

import pytest


def _create_quotation_with_token(client, auth_headers, *, status="Sent", token=None):
    token = token or str(uuid.uuid4())
    body = {
        "quoteId": "Q-100",
        "status": status,
        "clientResponseToken": token,
        "currency": "USD",
        "items": [{"name": "Freight", "quantity": 1, "price": 100, "taxPercent": 10}],
    }
    r = client.post("/api/quotations", headers=auth_headers, json=body)
    assert r.status_code == 201
    row = r.json()
    return row["id"], token


def test_quotation_list_create_get(client, auth_headers):
    qid, _ = _create_quotation_with_token(client, auth_headers)
    r = client.get("/api/quotations", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1
    r = client.get(f"/api/quotations/{qid}", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["quoteId"] == "Q-100"


def test_public_respond_get_accept(client, auth_headers):
    qid, tok = _create_quotation_with_token(client, auth_headers)
    r = client.get(f"/api/public/quotations/{qid}/respond", params={"action": "accept", "token": tok})
    assert r.status_code == 200
    assert "accepted" in r.text.lower()

    r = client.get(f"/api/quotations/{qid}", headers=auth_headers)
    assert r.json()["status"] == "Accepted"


def test_public_respond_get_reject(client, auth_headers):
    qid, tok = _create_quotation_with_token(client, auth_headers)
    r = client.get(f"/api/public/quotations/{qid}/respond", params={"action": "reject", "token": tok})
    assert r.status_code == 200
    assert "declined" in r.text.lower()
    r = client.get(f"/api/quotations/{qid}", headers=auth_headers)
    assert r.json()["status"] == "Rejected"


def test_public_respond_post_json(client, auth_headers):
    qid, tok = _create_quotation_with_token(client, auth_headers)
    r = client.post(
        f"/api/public/quotations/{qid}/respond",
        json={"token": tok, "action": "accept"},
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True, "status": "Accepted"}


def test_public_respond_wrong_token(client, auth_headers):
    qid, _ = _create_quotation_with_token(client, auth_headers)
    r = client.get(
        f"/api/public/quotations/{qid}/respond",
        params={"action": "accept", "token": "wrong"},
    )
    assert r.status_code == 403


def test_public_respond_when_quotation_has_no_token(client, auth_headers):
    r = client.post(
        "/api/quotations",
        headers=auth_headers,
        json={"quoteId": "Q-notoken", "status": "Sent"},
    )
    assert r.status_code == 201
    qid = r.json()["id"]
    r = client.get(
        f"/api/public/quotations/{qid}/respond",
        params={"action": "accept", "token": "any"},
    )
    assert r.status_code == 403


def test_public_respond_unknown_quotation(client):
    r = client.get(
        "/api/public/quotations/nope/respond",
        params={"action": "accept", "token": "t"},
    )
    assert r.status_code == 404


def test_public_respond_double_accept_conflict(client, auth_headers):
    qid, tok = _create_quotation_with_token(client, auth_headers)
    assert client.get(
        f"/api/public/quotations/{qid}/respond",
        params={"action": "accept", "token": tok},
    ).status_code == 200
    r = client.get(
        f"/api/public/quotations/{qid}/respond",
        params={"action": "reject", "token": tok},
    )
    assert r.status_code == 409


@pytest.mark.parametrize("action", ["accept", "Accept", " ACCEPT "])
def test_public_respond_action_case_insensitive(client, auth_headers, action):
    qid, tok = _create_quotation_with_token(client, auth_headers)
    r = client.post(
        f"/api/public/quotations/{qid}/respond",
        json={"token": tok, "action": action},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "Accepted"


def test_public_respond_invalid_action(client, auth_headers):
    qid, tok = _create_quotation_with_token(client, auth_headers)
    r = client.post(
        f"/api/public/quotations/{qid}/respond",
        json={"token": tok, "action": "maybe"},
    )
    assert r.status_code == 400
