from tests.conftest import register_user


def test_register_and_login(client):
    data = register_user(client)
    assert data["user"]["username"] == "alice"
    assert "access_token" in data

    response = client.post(
        "/auth/login", json={"email": "alice@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "alice@example.com"


def test_login_wrong_password(client):
    register_user(client)
    response = client.post(
        "/auth/login", json={"email": "alice@example.com", "password": "wrongpass"}
    )
    assert response.status_code == 401


def test_register_duplicate_email(client):
    register_user(client)
    response = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "username": "alice2", "password": "password123"},
    )
    assert response.status_code == 409
