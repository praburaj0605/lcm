from app.security import create_access_token, decode_token, hash_password, verify_password


def test_hash_and_verify_roundtrip():
    h = hash_password("secret-pass")
    assert verify_password("secret-pass", h)
    assert not verify_password("wrong", h)
    assert not verify_password("secret-pass", None)


def test_jwt_encode_decode():
    token = create_access_token("user-1", {"email": "u@test.com", "role": "admin"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-1"
    assert payload["email"] == "u@test.com"
    assert payload["role"] == "admin"


def test_decode_invalid_returns_none():
    assert decode_token("not.a.jwt") is None
