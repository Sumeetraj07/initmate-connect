import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, LogOut, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import type { Conversation, User } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/useAuth";
import { NewGroupDialog } from "@/components/NewGroupDialog";

export const Route = createFileRoute("/chat")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !api.token()) {
      throw redirect({ to: "/login" });
    }
  },
  component: ChatLayout,
});

function ChatLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);

  useEffect(() => {
    api.listConversations().then(setConversations).catch(() => {});
    api.listUsers().then(setUsers).catch(() => {});
  }, []);

  function refresh() {
    api.listConversations().then(setConversations);
  }

  // re-load conversations when route changes (after sending msg)
  useEffect(() => {
    refresh();
  }, [loc.pathname]);

  // Live update sidebar via WebSocket
  useEffect(() => {
    api.connectWS();
    const unsub = api.subscribeToEvents((event) => {
      if (event.type === "new_message") {
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id === event.message.conversationId) {
              const isActive = window.location.pathname === `/chat/${c.id}`;
              return {
                ...c,
                lastMessageAt: event.message.createdAt,
                lastPreview: event.message.kind === "text" ? event.message.content : `[${event.message.kind}]`,
                unread: isActive ? 0 : (c.unread || 0) + 1,
              };
            }
            return c;
          });
          // sort so latest is at the top
          return updated.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        });
      }
    });
    return unsub;
  }, []);

  if (!user) return null;

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.lastPreview.toLowerCase().includes(query.toLowerCase()),
  );

  const isDetail = loc.pathname !== "/chat";

  return (
    <div className="flex h-screen w-screen overflow-hidden p-0 md:p-4 gap-3">
      {/* Sidebar */}
      <aside
        className={`glass-strong flex w-full flex-col rounded-none md:w-80 md:rounded-3xl ${
          isDetail ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-aurora h-7 w-7 rounded-lg glow" />
            <span className="font-display text-lg font-bold">Aurora</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewGroup(true)}
              className="rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              title="New group"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => { logout(); navigate({ to: "/login" }); }}
              className="rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              maxLength={80}
            />
          </div>
        </div>

        {/* Conversations */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No conversations match.
            </div>
          )}
          <AnimatePresence>
            {filtered.map((c) => {
              const active = loc.pathname === `/chat/${c.id}`;
              const other = c.kind === "dm" ? users.find((u) => u.id === c.memberIds.find((m) => m !== user.id)) : null;
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Link
                    to="/chat/$conversationId"
                    params={{ conversationId: c.id }}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                      active ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <Avatar
                      name={c.name}
                      color={c.kind === "group" ? "oklch(0.72 0.21 295)" : (other?.avatarColor ?? "oklch(0.72 0.21 295)")}
                      online={c.kind === "dm" ? other?.online : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-medium">{c.name}</div>
                        <div className="shrink-0 text-[10px] text-muted-foreground">
                          {timeShort(c.lastMessageAt)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-xs text-muted-foreground">
                          {c.lastPreview}
                        </div>
                        {c.unread > 0 && (
                          <span className="bg-aurora ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-primary-foreground">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </nav>

        {/* Me */}
        <div className="flex items-center gap-3 border-t border-white/5 p-4">
          <Avatar name={user.name} color={user.avatarColor} online />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
          </div>
        </div>
      </aside>

      {/* Detail */}
      <main className={`flex-1 ${isDetail ? "flex" : "hidden md:flex"}`}>
        {loc.pathname === "/chat" ? <EmptyState /> : <Outlet />}
      </main>

      {showNewGroup && (
        <NewGroupDialog
          currentUserId={user.id}
          onClose={() => setShowNewGroup(false)}
          onCreated={(c) => {
            setShowNewGroup(false);
            refresh();
            navigate({ to: "/chat/$conversationId", params: { conversationId: c.id } });
          }}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-strong hidden flex-1 flex-col items-center justify-center rounded-3xl p-10 text-center md:flex">
      <div className="bg-aurora mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glow">
        <MessageSquare className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold">Pick a conversation</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Or start a new group. Mention <span className="text-aurora font-semibold">@someone</span> inside a group to send a message only they can read.
      </p>
    </div>
  );
}

function timeShort(t: number) {
  const d = new Date(t);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const day = 24 * 60 * 60 * 1000;
  if (now.getTime() - t < 7 * day) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString();
}
