import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { PostCard } from "../components/PostCard";
import { PostComposer } from "../components/PostComposer";
import { PostSkeleton } from "../components/PostSkeleton";
import { useAuth } from "../context/AuthContext";
import type { Post, Profile } from "../types";

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(null);
    setError(null);
    if (!username) return;
    api
      .get<Profile>(`/users/${username}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"));
  }, [username]);

  const isOwnProfile = user?.username === username;

  function handleCreated(post: Post) {
    setProfile((current) => (current ? { ...current, posts: [post, ...current.posts] } : current));
  }

  function handleUpdated(updated: Post) {
    setProfile((current) =>
      current
        ? { ...current, posts: current.posts.map((p) => (p.id === updated.id ? updated : p)) }
        : current
    );
  }

  function handleDeleted(postId: number) {
    setProfile((current) =>
      current ? { ...current, posts: current.posts.filter((p) => p.id !== postId) } : current
    );
  }

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (!profile) {
    return (
      <>
        <PostSkeleton />
        <PostSkeleton />
      </>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ margin: "0 0 4px" }}>{profile.user.username}</h2>
        <p className="muted">Joined {new Date(profile.user.created_at).toLocaleDateString()}</p>
      </div>

      {isOwnProfile && <PostComposer onCreated={handleCreated} />}

      {profile.posts.length === 0 && <p className="muted">No posts yet.</p>}

      {profile.posts.map((post) => (
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
