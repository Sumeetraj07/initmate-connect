/**
 * API + WebSocket adapter layer.
 *
 * This file is the ONLY place the UI talks to a backend.
 * Today it is wired to a FastAPI backend using VITE_API_URL and VITE_WS_URL.
 *
 * Expected FastAPI endpoints (all return JSON):
 *   POST /auth/signup        { username, email, password } -> { token, user }
 *   POST /auth/login         { username, password }        -> { token, user }
 *   GET  /me                                               -> User
 *   GET  /users                                            -> User[]
 *   GET  /conversations                                    -> Conversation[]
 *   GET  /conversations/:id/messages?before=...            -> Message[]
 *   POST /conversations/:id/messages  { kind, content, visibleTo?, mentions? } -> Message
 *   POST /conversations              { kind, name, memberIds }                  -> Conversation
 *   PATCH /conversations/:id/members  { add?: [], remove?: [] }                 -> Conversation
 *   POST /upload  (multipart) -> { url, name, size }
 *   WS   /ws?token=...   (events: message, typing, seen, presence)
 */

import type { Conversation, ID, Message, User } from "./types";

const STORAGE = {
  token: "aurora.token",
  user: "aurora.user",
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = api.token();
  const headers: Record<string, string> = {
    ...((options.headers as any) || {}),
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Only auto-logout if we're not on the login/signup page
      if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/signup")) {
        api.logout();
        window.location.href = "/login";
      }
    }
    let text = await response.text();
    // Parse FastAPI JSON error body {"detail": "..."}  
    try {
      const body = JSON.parse(text);
      if (body?.detail) text = body.detail;
    } catch {}
    throw new Error(text || `API Error: ${response.status}`);
  }
  
  return response.json();
}

// ---------- public API ----------

export const api = {
  // ----- auth -----
  async signup(input: { username: string; name: string; email: string; password: string }) {
    const data = await fetchAPI("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
    save(STORAGE.token, data.token);
    save(STORAGE.user, data.user);
    return data as { token: string; user: User };
  },

  async login(input: { username: string; password: string }) {
    const data = await fetchAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    save(STORAGE.token, data.token);
    save(STORAGE.user, data.user);
    return data as { token: string; user: User };
  },

  logout() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.user);
  },

  me(): User | null {
    return load<User | null>(STORAGE.user, null);
  },

  token(): string | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE.token);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },

  // ----- users -----
  async listUsers(): Promise<User[]> {
    return fetchAPI("/users");
  },

  // ----- conversations -----
  async listConversations(): Promise<Conversation[]> {
    return fetchAPI("/conversations");
  },

  async createGroup(input: { name: string; memberIds: ID[] }): Promise<Conversation> {
    return fetchAPI("/conversations", {
      method: "POST",
      body: JSON.stringify({ kind: "group", name: input.name, memberIds: input.memberIds }),
    });
  },

  async updateMembers(conversationId: ID, change: { add?: ID[]; remove?: ID[] }): Promise<Conversation> {
    return fetchAPI(`/conversations/${conversationId}/members`, {
      method: "PATCH",
      body: JSON.stringify(change),
    });
  },

  // ----- messages -----
  async listMessages(conversationId: ID): Promise<Message[]> {
    return fetchAPI(`/conversations/${conversationId}/messages`);
  },

  async sendMessage(input: Omit<Message, "id" | "createdAt" | "seenBy">): Promise<Message> {
    return fetchAPI(`/conversations/${input.conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        kind: input.kind,
        content: input.content,
        visibleTo: input.visibleTo,
        mentions: input.mentions,
        attachment: input.attachment,
      }),
    });
  },

  async deleteMessage(conversationId: ID, messageId: ID): Promise<void> {
    return fetchAPI(`/conversations/${conversationId}/messages/${messageId}`, {
      method: "DELETE",
    });
  },

  // ----- websockets -----
  subscribeToEvents(listener: (event: any) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  connectWS() {
    if (typeof window === "undefined" || ws) return;
    const token = api.token();
    if (!token) return; // don't connect if not logged in
    const base = import.meta.env.VITE_WS_URL || API_URL.replace(/^http/, "ws") + "/ws";
    const WS_URL = `${base}?token=${encodeURIComponent(token)}`;
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      reconnectDelay = 1000; // reset backoff on successful connection
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        listeners.forEach((l) => l(data));
      } catch {}
    };
    
    ws.onclose = (ev) => {
      ws = null;
      // Don't reconnect if closed due to auth failure (4001)
      if (ev.code === 4001) return;
      setTimeout(() => {
        api.connectWS();
        reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
      }, reconnectDelay);
    };

    ws.onerror = () => {
      ws?.close();
    };
  }
};

type Listener = (event: any) => void;
const listeners = new Set<Listener>();
let ws: WebSocket | null = null;
let reconnectDelay = 1000;

// ---------- visibility helper (the @mention USP, enforced client-side here;
//             your FastAPI must enforce it server-side too) ----------
export function canSee(message: Message, viewerId: ID): boolean {
  if (!message.visibleTo || message.visibleTo.length === 0) return true;
  if (message.authorId === viewerId) return true;
  return message.visibleTo.includes(viewerId);
}
