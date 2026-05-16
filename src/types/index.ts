export interface User {
  id: string;
  nickname: string;
  avatar: string;
}

export interface Post {
  id: string;
  author: User;
  createdAt: string;
  coverImage: string;
  title: string;
  content?: string;
  images?: string[];
  likes: number;
  comments: number;
  tags?: string[];
  heatCount?: number;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
}
