from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_current_user_optional
from app.models import Comment, Like, Post, User
from app.schemas import PostCreate, PostOut, PostUpdate

router = APIRouter(prefix="/posts", tags=["posts"])


def _serialize_posts(db: Session, posts: list[Post], current_user: User | None) -> list[PostOut]:
    if not posts:
        return []

    post_ids = [p.id for p in posts]
    like_counts = dict(
        db.query(Like.post_id, func.count(Like.id))
        .filter(Like.post_id.in_(post_ids))
        .group_by(Like.post_id)
        .all()
    )
    comment_counts = dict(
        db.query(Comment.post_id, func.count(Comment.id))
        .filter(Comment.post_id.in_(post_ids))
        .group_by(Comment.post_id)
        .all()
    )
    liked_post_ids = set()
    if current_user is not None:
        liked_post_ids = {
            row[0]
            for row in db.query(Like.post_id)
            .filter(Like.post_id.in_(post_ids), Like.user_id == current_user.id)
            .all()
        }

    return [
        PostOut(
            id=p.id,
            text=p.text,
            created_at=p.created_at,
            updated_at=p.updated_at,
            author=p.author,
            like_count=like_counts.get(p.id, 0),
            comment_count=comment_counts.get(p.id, 0),
            liked_by_me=p.id in liked_post_ids,
        )
        for p in posts
    ]


def _get_owned_post(db: Session, post_id: int, current_user: User) -> Post:
    post = db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your post")
    return post


@router.get("", response_model=list[PostOut])
def list_feed(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    posts = db.query(Post).order_by(Post.created_at.desc()).all()
    return _serialize_posts(db, posts, current_user)


@router.post("", response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = Post(text=payload.text, author_id=current_user.id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return _serialize_posts(db, [post], current_user)[0]


@router.put("/{post_id}", response_model=PostOut)
def update_post(
    post_id: int,
    payload: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = _get_owned_post(db, post_id, current_user)
    post.text = payload.text
    db.commit()
    db.refresh(post)
    return _serialize_posts(db, [post], current_user)[0]


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = _get_owned_post(db, post_id, current_user)
    db.delete(post)
    db.commit()
