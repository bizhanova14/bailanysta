from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_current_user_optional
from app.models import Comment, Like, Post, User
from app.schemas import PostOut, ProfileOut, UserWithEmail

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserWithEmail)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/{username}", response_model=ProfileOut)
def get_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    posts = (
        db.query(Post)
        .filter(Post.author_id == user.id)
        .order_by(Post.created_at.desc())
        .all()
    )

    post_ids = [p.id for p in posts]
    like_counts = dict(
        db.query(Like.post_id, func.count(Like.id))
        .filter(Like.post_id.in_(post_ids))
        .group_by(Like.post_id)
        .all()
    ) if post_ids else {}
    comment_counts = dict(
        db.query(Comment.post_id, func.count(Comment.id))
        .filter(Comment.post_id.in_(post_ids))
        .group_by(Comment.post_id)
        .all()
    ) if post_ids else {}
    liked_post_ids = set()
    if current_user is not None and post_ids:
        liked_post_ids = {
            row[0]
            for row in db.query(Like.post_id)
            .filter(Like.post_id.in_(post_ids), Like.user_id == current_user.id)
            .all()
        }

    posts_out = [
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

    return ProfileOut(user=user, posts=posts_out)
