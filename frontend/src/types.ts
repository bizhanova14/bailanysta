export interface UserPublic {
  id: number;
  username: string;
  bio: string | null;
  created_at: string;
}

export interface UserWithEmail extends UserPublic {
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserWithEmail;
}

export interface Post {
  id: number;
  text: string;
  created_at: string;
  updated_at: string;
  author: UserPublic;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  text: string;
  created_at: string;
  author: UserPublic;
}

export interface Profile {
  user: UserPublic;
  posts: Post[];
}
