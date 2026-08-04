import { Client, IMessage } from '@stomp/stompjs';
import { API } from '@/constants/api';
import { getAuthHeaders, getAuthToken } from '@/utils/authHeaders';

// FIXED — this used to connect via SockJS (new SockJS(`${BASE_URL}/ws`)),
// which does an HTTP handshake first (/ws/info, then long-polling/xhr
// fallback transports) before ever opening a real WebSocket. That can't
// work through api-gateway's chat-service-ws route, which proxies /ws/**
// using the raw `ws://` scheme (application.yaml: ws-base-url:
// ws://localhost:8087) — a ws://-scheme route only understands WebSocket
// upgrade requests, not SockJS's plain-HTTP fallback endpoints.
//
// Turns out the backend side confirms this: chat-service's
// WebSocketConfig registers `registry.addEndpoint("/ws")` with NO
// `.withSockJS()` call — i.e. it's a plain STOMP-over-WebSocket endpoint,
// not a SockJS one. The frontend and backend were speaking two different
// protocols at the same URL.
//
// Fix: drop sockjs-client entirely and connect with stompjs's native
// `brokerURL` (a real ws:// URL), which does a direct WebSocket upgrade —
// exactly what both the gateway route and the backend endpoint expect.
// The STOMP CONNECT-frame auth below (connectHeaders) is unchanged and
// still required — chat-service's StompAuthChannelInterceptor rejects any
// connection without a valid JWT regardless of transport.
// Uses API.ws (built from getDirectBackendUrl()), not API.base — the
// WebSocket upgrade isn't proxied through Metro (see metro.config.js), so in
// dev this has to point at the real backend address/port directly, while the
// REST calls below go through Metro's proxy. In a standalone build there is
// no proxy and the two collapse to the same origin.
//
// FIXED 2026-08-04 — this was `const WS_BASE_URL = DIRECT_BACKEND_URL...`,
// evaluated once at module load. That froze the address before the saved
// server-URL override had been hydrated from AsyncStorage, so chat kept
// dialing the build-time host even after the user pointed the app somewhere
// else. API.ws is a getter and re-resolves per read.

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: 'TEXT' | 'AUDIO' | 'VIDEO';
  mediaUrl?: string;
  sentAt: string;
  read: boolean;
}

// Was API.auth.replace('/api/auth', '') — worked, but fragile (silently
// wrong if API.auth's path ever changed) and pointless when API.chat is
// already the exact same origin plus the right prefix.

let stompClient: Client | null = null;

export async function connectToConversation(
  conversationId: string,
  onMessage: (msg: ChatMessage) => void
): Promise<void> {
  // chat-service's StompAuthChannelInterceptor validates a JWT on every
  // CONNECT frame and rejects the session outright if it's missing/invalid
  // (MICROSERVICES_PLAN.md step 8f) — connectHeaders is how stompjs attaches
  // custom headers to that CONNECT frame, same secret/claims the gateway
  // and auth-service already use.
  const token = await getAuthToken();

  stompClient = new Client({
    brokerURL: API.ws,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    onConnect: () => {
      stompClient?.subscribe(`/topic/conversation/${conversationId}`, (frame: IMessage) => {
        const msg: ChatMessage = JSON.parse(frame.body);
        onMessage(msg);
      });
    },
  });

  stompClient.activate();
}

export function disconnect(): void {
  stompClient?.deactivate();
  stompClient = null;
}

async function parseOrThrow(res: Response, label: string) {
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status})`);
  }
  return res.json();
}

export async function startConversation(
  patientId: string,
  pharmacistId: string
): Promise<{ id: string }> {
  const res = await fetch(
    `${API.chat}/conversation/start?patientId=${patientId}&pharmacistId=${pharmacistId}`,
    { method: 'POST', headers: await getAuthHeaders() }
  );
  return parseOrThrow(res, 'Starting conversation');
}

export async function startDriverConversation(
  patientId: string,
  driverId: string
): Promise<{ id: string }> {
  const res = await fetch(
    `${API.chat}/conversation/start-driver-chat?patientId=${patientId}&driverId=${driverId}`,
    { method: 'POST', headers: await getAuthHeaders() }
  );
  return parseOrThrow(res, 'Starting conversation');
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<ChatMessage> {
  const res = await fetch(`${API.chat}/message/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ conversationId, senderId, content, messageType: 'TEXT' }),
  });
  return parseOrThrow(res, 'Sending message');
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API.chat}/messages/${conversationId}`, { headers: await getAuthHeaders() });
  return parseOrThrow(res, 'Loading messages');
}

export async function getConversationsForUser(userId: string): Promise<any[]> {
  const res = await fetch(`${API.chat}/conversations/${userId}`, { headers: await getAuthHeaders() });
  return parseOrThrow(res, 'Loading conversations');
}

export async function searchPharmacists(query: string, pharmacyId?: string) {
  const params = new URLSearchParams({ q: query });
  if (pharmacyId) params.append('pharmacyId', pharmacyId);
  const res = await fetch(`${API.chat}/pharmacists/search?${params}`, { headers: await getAuthHeaders() });
  return parseOrThrow(res, 'Searching pharmacists');
}

export async function sendMediaMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: 'TEXT' | 'AUDIO' | 'VIDEO',
  mediaUrl?: string
): Promise<ChatMessage> {
  const res = await fetch(`${API.chat}/message/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ conversationId, senderId, content, messageType, mediaUrl }),
  });
  return parseOrThrow(res, 'Sending message');
}
