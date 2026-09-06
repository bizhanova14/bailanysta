import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Post } from "../types";

interface PostComposerProps {
  onCreated: (post: Post) => void;
}

export function PostComposer({ onCreated }: PostComposerProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const post = await api.post<Post>("/posts", { text: text.trim() });
      onCreated(post);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="form-field">
        <textarea
          rows={3}
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button className="btn" type="submit" disabled={isSubmitting || !text.trim()}>
        {isSubmitting ? "Posting..." : "Post"}
      </button>
    </form>
  );
}
