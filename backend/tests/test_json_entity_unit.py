"""Unit tests for JSON document CRUD helpers."""

import uuid

from app.crud import json_entity as je
from app.models.documents import ClientRow


def test_create_list_get_replace_delete(db_session):
    created = je.create_doc(db_session, ClientRow, {"companyName": "Co", "email": "e@e.com"}, "clients")
    cid = created["id"]
    assert created["companyName"] == "Co"

    rows = je.list_docs(db_session, ClientRow, "clients")
    assert len(rows) == 1

    got = je.get_doc(db_session, ClientRow, cid)
    assert got["email"] == "e@e.com"

    replaced = je.replace_doc(db_session, ClientRow, cid, {"companyName": "Co2"}, "clients")
    assert replaced["companyName"] == "Co2"

    assert je.delete_doc(db_session, ClientRow, cid, "clients")
    assert je.get_doc(db_session, ClientRow, cid) is None


def test_create_with_explicit_id(db_session):
    cid = f"cust_{uuid.uuid4().hex[:8]}"
    row = je.create_doc(db_session, ClientRow, {"id": cid, "name": "N"}, "clients")
    assert row["id"] == cid
