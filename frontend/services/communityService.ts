import { API } from '@/constants/api';
import { getAuthHeaders } from '@/utils/authHeaders';

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
  // Backend badges pharmacist-authored posts so the feed can show a
  // "Health Professional" badge next to their name.
  isHealthProfessional?: boolean;
};

export async function getCommunities(userId?: string): Promise<Community[]> {
  const url = userId ? `${API.community}?userId=${userId}` : API.community;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  return res.json();
}

export async function joinCommunity(communityId: string, userId: string) {
  const res = await fetch(`${API.community}/${communityId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function getCommunityPosts(communityId: string, userId?: string): Promise<CommunityPost[]> {
  const url = userId
    ? `${API.community}/${communityId}/posts?userId=${userId}`
    : `${API.community}/${communityId}/posts`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  return res.json();
}

export async function createPost(communityId: string, userId: string, content: string) {
  const res = await fetch(`${API.community}/${communityId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId, content }),
  });
  return res.json();
}

export async function likePost(postId: string, userId: string) {
  const res = await fetch(`${API.community}/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId }),
  });
  return res.json();
}

export async function commentOnPost(postId: string, userId: string, content: string) {
  const res = await fetch(`${API.community}/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId, content }),
  });
  return res.json();
}

export type PostCommentItem = {
  id: string;
  postId: string;
  userId: string;
  authorName?: string;
  content: string;
  createdAt: string;
};

// UPDATED — this previously fell back to an empty list because the backend
// had no GET endpoint for listing a post's comments. That's since been
// built (community-service now exposes GET /api/community/posts/{postId}/
// comments with resolved authorName, per MICROSERVICES_PLAN.md step 5c) —
// the try/catch soft-fail stays as defensive behavior for a genuinely
// unreachable backend, not because the route is expected to be missing.
export async function getPostComments(postId: string): Promise<PostCommentItem[]> {
  try {
    const res = await fetch(`${API.community}/posts/${postId}/comments`, { headers: await getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
