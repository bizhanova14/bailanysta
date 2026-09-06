from tests.conftest import register_user


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_feed(client):
    alice = register_user(client)
    token = alice["access_token"]

    response = client.post("/posts", json={"text": "hello world"}, headers=auth_header(token))
    assert response.status_code == 201
    post = response.json()
    assert post["author"]["username"] == "alice"
    assert post["like_count"] == 0
    assert post["comment_count"] == 0

    feed = client.get("/posts")
    assert feed.status_code == 200
    assert len(feed.json()) == 1


def test_cannot_edit_or_delete_others_post(client):
    alice = register_user(client)
    bob = register_user(client, email="bob@example.com", username="bob")

    post = client.post(
        "/posts", json={"text": "alice's post"}, headers=auth_header(alice["access_token"])
    ).json()

    edit_response = client.put(
        f"/posts/{post['id']}",
        json={"text": "hijacked"},
        headers=auth_header(bob["access_token"]),
    )
    assert edit_response.status_code == 403

    delete_response = client.delete(
        f"/posts/{post['id']}", headers=auth_header(bob["access_token"])
    )
    assert delete_response.status_code == 403


def test_like_and_comment_flow(client):
    alice = register_user(client)
    bob = register_user(client, email="bob@example.com", username="bob")

    post = client.post(
        "/posts", json={"text": "alice's post"}, headers=auth_header(alice["access_token"])
    ).json()

    like_response = client.post(
        f"/posts/{post['id']}/like", headers=auth_header(bob["access_token"])
    )
    assert like_response.status_code == 204

    comment_response = client.post(
        f"/posts/{post['id']}/comments",
        json={"text": "nice post!"},
        headers=auth_header(bob["access_token"]),
    )
    assert comment_response.status_code == 201

    feed = client.get("/posts", headers=auth_header(bob["access_token"])).json()
    assert feed[0]["like_count"] == 1
    assert feed[0]["comment_count"] == 1
    assert feed[0]["liked_by_me"] is True

    unlike_response = client.delete(
        f"/posts/{post['id']}/like", headers=auth_header(bob["access_token"])
    )
    assert unlike_response.status_code == 204
