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

// HARDENED — these used to call res.json() unconditionally. On any non-2xx
// (a 403 from the gateway, a 502 while community-service restarts) the body
// is an error object or an HTML page, so .json() either threw or resolved to
// something that isn't an array — and the screens then crashed on .map().
// Throwing a real Error instead lets the callers show a retry state that is
// distinguishable from "there genuinely are no communities".
async function readJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`Could not load ${what} (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function getCommunities(userId?: string): Promise<Community[]> {
  const url = userId ? `${API.community}?userId=${userId}` : API.community;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  const data = await readJson<Community[]>(res, 'communities');
  return Array.isArray(data) ? data : [];
}

export async function joinCommunity(communityId: string, userId: string) {
  const res = await fetch(`${API.community}/${communityId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Could not join this group');
  return res.json();
}

// NEW — pairs with joinCommunity above, backed by the new
// POST /api/community/{id}/leave route on community-service.
export async function leaveCommunity(communityId: string, userId: string) {
  const res = await fetch(`${API.community}/${communityId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Could not leave this group');
  return res.json();
}

export async function getCommunityPosts(communityId: string, userId?: string): Promise<CommunityPost[]> {
  const url = userId
    ? `${API.community}/${communityId}/posts?userId=${userId}`
    : `${API.community}/${communityId}/posts`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  const data = await readJson<CommunityPost[]>(res, 'posts');
  return Array.isArray(data) ? data : [];
}

export async function createPost(communityId: string, userId: string, content: string) {
  const res = await fetch(`${API.community}/${communityId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId, content }),
  });
  // Must throw rather than soft-fail: the compose bar clears the user's
  // draft on success, so a silent failure would delete what they typed.
  if (!res.ok) throw new Error('Could not publish your post');
  return res.json();
}

export async function likePost(postId: string, userId: string) {
  const res = await fetch(`${API.community}/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Could not update your like');
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
