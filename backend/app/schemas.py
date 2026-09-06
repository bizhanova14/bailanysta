from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    bio: str | None
    created_at: datetime


class UserWithEmail(UserPublic):
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserWithEmail


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    text: str
    created_at: datetime
    author: UserPublic


class PostCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class PostUpdate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    created_at: datetime
    updated_at: datetime
    author: UserPublic
    like_count: int
    comment_count: int
    liked_by_me: bool


class ProfileOut(BaseModel):
    user: UserPublic
    posts: list[PostOut]
