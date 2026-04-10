def test_enquiry_crud(client, auth_headers):
    r = client.post("/api/enquiries", headers=auth_headers, json={"enquiryId": "E-1", "status": "Open"})
    assert r.status_code == 201
    eid = r.json()["id"]

    r = client.get("/api/enquiries", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.delete(f"/api/enquiries/{eid}", headers=auth_headers)
    assert r.status_code == 204


def test_invoice_crud(client, auth_headers):
    r = client.post("/api/invoices", headers=auth_headers, json={"invoiceNumber": "INV-1", "status": "Draft"})
    assert r.status_code == 201
    iid = r.json()["id"]

    r = client.get("/api/invoices", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.put(
        f"/api/invoices/{iid}",
        headers=auth_headers,
        json={"invoiceNumber": "INV-1", "status": "Sent"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "Sent"
