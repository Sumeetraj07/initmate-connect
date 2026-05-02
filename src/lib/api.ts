/**
 * API + WebSocket adapter layer.
 *
 * This file is the ONLY place the UI talks to a backend.
 * Today it returns mock data so the UI is fully functional offline.
 * To wire your FastAPI backend, set VITE_API_URL and VITE_WS_URL,
 * then replace the bodies of these functions with `fetch(...)` / `new WebSocket(...)`.
 *
 * Suggested FastAPI endpoints (all return JSON):
 *   POST /auth/signup        { username, email, password } -> { token, user }
 *   POST /auth/login         { username, password }        -> { token, user }
 *   GET  /me                                               -> User
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
  convos: "aurora.convos",
  msgs: "aurora.msgs",
};

// ---------- seed data ----------
const palette = [
  "oklch(0.7 0.2 295)",
  "oklch(0.75 0.18 215)",
  "oklch(0.72 0.22 340)",
  "oklch(0.78 0.18 160)",
  "oklch(0.78 0.18 60)",
  "oklch(0.7 0.22 25)",
];

const seedUsers: User[] = [
  { id: "u_rahul", username: "rahul", name: "Rahul Sharma", avatarColor: palette[0], online: true },
  { id: "u_priya", username: "priya", name: "Priya Patel", avatarColor: palette[1], online: true },
  { id: "u_arjun", username: "arjun", name: "Arjun Mehta", avatarColor: palette[2], online: false },
  { id: "u_sara", username: "sara", name: "Sara Khan", avatarColor: palette[3], online: true },
  { id: "u_dev", username: "dev", name: "Dev Iyer", avatarColor: palette[4], online: false },
];

function ensureSeeded(meId: ID) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE.convos)) return;

  const convos: Conversation[] = [
    {
      id: "c_dm_rahul",
      kind: "dm",
      name: "Rahul Sharma",
      memberIds: [meId, "u_rahul"],
      adminIds: [],
      lastMessageAt: Date.now() - 1000 * 60 * 5,
      lastPreview: "See you at 7?",
      unread: 2,
    },
    {
      id: "c_grp_design",
      kind: "group",
      name: "Design Squad",
      memberIds: [meId, "u_rahul", "u_priya", "u_arjun", "u_sara"],
      adminIds: [meId],
      lastMessageAt: Date.now() - 1000 * 60 * 25,
      lastPreview: "@priya pushed the new mocks",
      unread: 0,
    },
    {
      id: "c_grp_founders",
      kind: "group",
      name: "Founders",
      memberIds: [meId, "u_dev", "u_sara", "u_arjun"],
      adminIds: [meId, "u_dev"],
      lastMessageAt: Date.now() - 1000 * 60 * 60 * 3,
      lastPreview: "Investor call moved to Friday",
      unread: 5,
    },
    {
      id: "c_dm_sara",
      kind: "dm",
      name: "Sara Khan",
      memberIds: [meId, "u_sara"],
      adminIds: [],
      lastMessageAt: Date.now() - 1000 * 60 * 60 * 24,
      lastPreview: "Voice message",
      unread: 0,
    },
  ];

  const msgs: Record<string, Message[]> = {
    c_dm_rahul: [
      mk("c_dm_rahul", "u_rahul", "text", "Hey! you free tonight?", 30),
      mk("c_dm_rahul", meId, "text", "Yeah, what's up?", 25),
      mk("c_dm_rahul", "u_rahul", "text", "Coffee at the new spot near Indira Nagar", 10),
      mk("c_dm_rahul", "u_rahul", "text", "See you at 7?", 5),
    ],
    c_grp_design: [
      mk("c_grp_design", "u_priya", "text", "Pushed the new mocks to figma 🎨", 60),
      mk("c_grp_design", "u_arjun", "text", "Looks 🔥", 55),
      mk("c_grp_design", meId, "text", "@priya can you share the dark variant separately?", 30, ["u_priya"], ["u_priya"]),
      mk("c_grp_design", "u_priya", "text", "On it! sending in 5", 25),
    ],
    c_grp_founders: [
      mk("c_grp_founders", "u_dev", "text", "Investor call moved to Friday 11am", 200),
      mk("c_grp_founders", "u_sara", "text", "Got it", 180),
      mk("c_grp_founders", meId, "text", "@dev can you forward the deck?", 170, ["u_dev"], ["u_dev"]),
    ],
    c_dm_sara: [
      mk("c_dm_sara", "u_sara", "voice", "Voice message", 1500, undefined, undefined, {
        name: "voice.webm", url: "#", durationSec: 14,
      }),
    ],
  };

  localStorage.setItem(STORAGE.convos, JSON.stringify(convos));
  localStorage.setItem(STORAGE.msgs, JSON.stringify(msgs));
}

function mk(
  conversationId: ID, authorId: ID, kind: Message["kind"], content: string, minutesAgo: number,
  visibleTo?: ID[], mentions?: ID[], attachment?: Message["attachment"],
): Message {
  return {
    id: "m_" + Math.random().toString(36).slice(2, 10),
    conversationId, authorId, kind, content,
    visibleTo, mentions, attachment,
    createdAt: Date.now() - 1000 * 60 * minutesAgo,
    seenBy: [authorId],
  };
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- public API ----------

export const api = {
  // ----- auth -----
  async signup(input: { username: string; name: string; email: string; password: string }) {
    await delay(400);
    const user: User = {
      id: "u_me",
      username: input.username,
      name: input.name || input.username,
      avatarColor: "oklch(0.72 0.21 295)",
      online: true,
    };
    const token = "mock." + btoa(input.username) + "." + Date.now();
    save(STORAGE.token, token);
    save(STORAGE.user, user);
    ensureSeeded(user.id);
    return { token, user };
  },

  async login(input: { username: string; password: string }) {
    await delay(400);
    const user: User = {
      id: "u_me",
      username: input.username || "you",
      name: input.username || "You",
      avatarColor: "oklch(0.72 0.21 295)",
      online: true,
    };
    const token = "mock." + btoa(user.username) + "." + Date.now();
    save(STORAGE.token, token);
    save(STORAGE.user, user);
    ensureSeeded(user.id);
    return { token, user };
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
    return localStorage.getItem(STORAGE.token);
  },

  // ----- users -----
  async listUsers(): Promise<User[]> {
    return seedUsers;
  },

  // ----- conversations -----
  async listConversations(): Promise<Conversation[]> {
    const me = this.me();
    if (me) ensureSeeded(me.id);
    const list = load<Conversation[]>(STORAGE.convos, []);
    return [...list].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },

  async createGroup(input: { name: string; memberIds: ID[] }): Promise<Conversation> {
    const me = this.me()!;
    const list = load<Conversation[]>(STORAGE.convos, []);
    const convo: Conversation = {
      id: "c_" + Math.random().toString(36).slice(2, 8),
      kind: "group",
      name: input.name,
      memberIds: [me.id, ...input.memberIds],
      adminIds: [me.id],
      lastMessageAt: Date.now(),
      lastPreview: "Group created",
      unread: 0,
    };
    save(STORAGE.convos, [convo, ...list]);
    return convo;
  },

  async updateMembers(conversationId: ID, change: { add?: ID[]; remove?: ID[] }) {
    const list = load<Conversation[]>(STORAGE.convos, []);
    const next = list.map((c) => {
      if (c.id !== conversationId) return c;
      const m = new Set(c.memberIds);
      change.add?.forEach((id) => m.add(id));
      change.remove?.forEach((id) => m.delete(id));
      return { ...c, memberIds: Array.from(m) };
    });
    save(STORAGE.convos, next);
    return next.find((c) => c.id === conversationId)!;
  },

  // ----- messages -----
  async listMessages(conversationId: ID): Promise<Message[]> {
    const all = load<Record<string, Message[]>>(STORAGE.msgs, {});
    return all[conversationId] ?? [];
  },

  async sendMessage(input: Omit<Message, "id" | "createdAt" | "seenBy">): Promise<Message> {
    const all = load<Record<string, Message[]>>(STORAGE.msgs, {});
    const msg: Message = {
      ...input,
      id: "m_" + Math.random().toString(36).slice(2, 10),
      createdAt: Date.now(),
      seenBy: [input.authorId],
    };
    all[input.conversationId] = [...(all[input.conversationId] ?? []), msg];
    save(STORAGE.msgs, all);

    // bump conversation
    const list = load<Conversation[]>(STORAGE.convos, []);
    save(
      STORAGE.convos,
      list.map((c) =>
        c.id === input.conversationId
          ? { ...c, lastMessageAt: msg.createdAt, lastPreview: previewOf(msg) }
          : c,
      ),
    );
    return msg;
  },
};

function previewOf(m: Message) {
  if (m.kind === "voice") return "🎤 Voice message";
  if (m.kind === "image") return "📷 Photo";
  if (m.kind === "video") return "🎬 Video";
  if (m.kind === "file") return "📎 " + (m.attachment?.name ?? "File");
  return m.content;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- visibility helper (the @mention USP, enforced client-side here;
//             your FastAPI must enforce it server-side too) ----------
export function canSee(message: Message, viewerId: ID): boolean {
  if (!message.visibleTo || message.visibleTo.length === 0) return true;
  if (message.authorId === viewerId) return true;
  return message.visibleTo.includes(viewerId);
}
