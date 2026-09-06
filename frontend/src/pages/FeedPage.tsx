import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PostCard } from "../components/PostCard";
import { PostComposer } from "../components/PostComposer";
import { PostSkeleton } from "../components/PostSkeleton";
import { useAuth } from "../context/AuthContext";
import type { Post } from "../types";

export function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api
      .get<Post[]>("/posts")
      .then(setPosts)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load feed"));
  }, []);

  function handleCreated(post: Post) {
    setPosts((current) => [post, ...(current ?? [])]);
  }

  function handleUpdated(updated: Post) {
    setPosts((current) => current?.map((p) => (p.id === updated.id ? updated : p)) ?? current);
  }

  function handleDeleted(postId: number) {
    setPosts((current) => current?.filter((p) => p.id !== postId) ?? current);
  }

  const filteredPosts = posts?.filter((post) => {
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return post.text.toLowerCase().includes(needle) || post.author.username.toLowerCase().includes(needle);
  });

  return (
    <div>
      <PostComposer onCreated={handleCreated} />

      <div className="form-field">
        <input
          type="text"
          placeholder="Search posts by keyword, hashtag, or author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      {posts === null && !error && (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      )}

      {filteredPosts?.length === 0 && <p className="muted">No posts to show.</p>}

      {filteredPosts?.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUsername={user?.username}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      ))}
    </div>
  );
}
