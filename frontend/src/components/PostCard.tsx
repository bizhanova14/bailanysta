import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Comment, Post } from "../types";

interface PostCardProps {
  post: Post;
  currentUsername?: string;
  onUpdated: (post: Post) => void;
  onDeleted: (postId: number) => void;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PostCard({ post, currentUsername, onUpdated, onDeleted }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const isOwner = currentUsername === post.author.username;

  async function toggleLike() {
    if (isLiking) return;
    setIsLiking(true);
    const wasLiked = post.liked_by_me;
    onUpdated({
      ...post,
      liked_by_me: !wasLiked,
      like_count: post.like_count + (wasLiked ? -1 : 1),
    });
    try {
      if (wasLiked) {
        await api.delete(`/posts/${post.id}/like`);
      } else {
        await api.post(`/posts/${post.id}/like`);
      }
    } catch {
      onUpdated(post);
    } finally {
      setIsLiking(false);
    }
  }

  async function loadComments() {
    if (comments !== null) {
      setShowComments((current) => !current);
      return;
    }
    const data = await api.get<Comment[]>(`/posts/${post.id}/comments`);
    setComments(data);
    setShowComments(true);
  }

  async function handleAddComment(event: FormEvent) {
    event.preventDefault();
    if (!commentDraft.trim() || isCommenting) return;
    setIsCommenting(true);
    try {
      const comment = await api.post<Comment>(`/posts/${post.id}/comments`, {
        text: commentDraft.trim(),
      });
      setComments((current) => [...(current ?? []), comment]);
      setCommentDraft("");
      onUpdated({ ...post, comment_count: post.comment_count + 1 });
    } finally {
      setIsCommenting(false);
    }
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    const updated = await api.put<Post>(`/posts/${post.id}`, { text: editText.trim() });
    onUpdated(updated);
    setIsEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    await api.delete(`/posts/${post.id}`);
    onDeleted(post.id);
  }

  return (
    <article className="card">
      <div className="post-header">
        <span className="post-author">{post.author.username}</span>
        <span className="muted">{formatTimestamp(post.created_at)}</span>
      </div>

      {isEditing ? (
        <div className="form-field">
          <textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={2000} />
          <div className="post-actions">
            <button className="btn" onClick={saveEdit}>
              Save
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsEditing(false);
                setEditText(post.text);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="post-text">{post.text}</p>
      )}

      <div className="post-actions">
        <button className={`icon-btn ${post.liked_by_me ? "liked" : ""}`} onClick={toggleLike}>
          {post.liked_by_me ? "♥" : "♡"} {post.like_count}
        </button>
        <button className="icon-btn" onClick={loadComments}>
          💬 {post.comment_count}
        </button>
        {isOwner && !isEditing && (
          <>
            <button className="icon-btn" onClick={() => setIsEditing(true)}>
              Edit
            </button>
            <button className="icon-btn" onClick={handleDelete} style={{ color: "var(--color-danger)" }}>
              Delete
            </button>
          </>
        )}
      </div>

      {showComments && (
        <div className="comment-list">
          {comments?.map((comment) => (
            <div className="comment-item" key={comment.id}>
              <span className="comment-author">{comment.author.username}</span>
              {comment.text}
            </div>
          ))}
          {comments?.length === 0 && <p className="muted">No comments yet.</p>}
          <form className="comment-form" onSubmit={handleAddComment}>
            <textarea
              rows={1}
              placeholder="Write a comment..."
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              maxLength={500}
            />
            <button className="btn" type="submit" disabled={isCommenting || !commentDraft.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
