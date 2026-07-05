import { API } from '@/constants/api';

export type Community = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  postsToday: number;
  joined?: boolean;
};

export type CommunityPost = {
  id: string;
  communityId: string;
  authorName: string;
  content: string;
  likes: number;
  commentsCount: number;
  liked: boolean;
  createdAt: string;
};

export async function getCommunities(userId?: string): Promise<Community[]> {
  const url = userId ? `${API.community}?userId=${userId}` : API.community;
  const res = await fetch(url);
  return res.json();
}

export async function joinCommunity(communityId: string, userId: string) {
  const res = await fetch(`${API.community}/${communityId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function getCommunityPosts(communityId: string, userId?: string): Promise<CommunityPost[]> {
  const url = userId
    ? `${API.community}/${communityId}/posts?userId=${userId}`
    : `${API.community}/${communityId}/posts`;
  const res = await fetch(url);
  return res.json();
}

export async function createPost(communityId: string, userId: string, content: string) {
  const res = await fetch(`${API.community}/${communityId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content }),
  });
  return res.json();
}

export async function likePost(postId: string, userId: string) {
  const res = await fetch(`${API.community}/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function commentOnPost(postId: string, userId: string, content: string) {
  const res = await fetch(`${API.community}/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content }),
  });
  return res.json();
}
