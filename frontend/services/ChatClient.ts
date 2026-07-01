import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
  read: boolean;
}

const BASE_URL = 'http://10.132.83.9:8080';

let stompClient: Client | null = null;

export function connectToConversation(
  conversationId: string,
  onMessage: (msg: ChatMessage) => void
): void {
  stompClient = new Client({
    webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
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

export async function startConversation(
  patientId: string,
  pharmacistId: string
): Promise<{ id: string }> {
  const res = await fetch(
    `${BASE_URL}/api/chat/conversation/start?patientId=${patientId}&pharmacistId=${pharmacistId}`,
    { method: 'POST' }
  );
  return res.json();
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<ChatMessage> {
  const res = await fetch(`${BASE_URL}/api/chat/message/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, senderId, content }),
  });
  return res.json();
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE_URL}/api/chat/messages/${conversationId}`);
  return res.json();
}

export async function getConversationsForUser(userId: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/chat/conversations/${userId}`);
  return res.json();
}