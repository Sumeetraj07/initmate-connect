import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Mic, Paperclip, Image as ImageIcon, Smile, Lock, Check, CheckCheck, MoreVertical, Square, Users } from "lucide-react";
import { api, canSee } from "@/lib/api";
import type { Conversation, Message, User } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/useAuth";
import { GroupSettings } from "@/components/GroupSettings";

export const Route = createFileRoute("/chat/$conversationId")({
  component: ConversationView,
});

function ConversationView() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listConversations(), api.listUsers(), api.listMessages(conversationId)]).then(
      ([cs, us, ms]) => {
        if (cancelled) return;
        const c = cs.find((x) => x.id === conversationId) ?? null;
        setConversation(c);
        setUsers(us);
        setMessages(ms);
      },
    );
    return () => { cancelled = true; };
  }, [conversationId]);

  // Live updates via WebSocket
  useEffect(() => {
    api.connectWS();
    const unsub = api.subscribeToEvents((event) => {
      if (event.type === "new_message" && event.message.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.message.id)) return prev;
          return [...prev, event.message];
        });
      }
    });
    return unsub;
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // Fake "other typing" indicator after sending in DM
  useEffect(() => {
    if (!conversation || conversation.kind !== "dm" || !user) return;
    const last = messages[messages.length - 1];
    if (!last || last.authorId !== user.id) return;
    const otherId = conversation.memberIds.find((m) => m !== user.id);
    const other = users.find((u) => u.id === otherId);
    if (!other) return;
    const t1 = setTimeout(() => setTyping(other.name), 600);
    const t2 = setTimeout(() => setTyping(null), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, conversation, user, users]);

  // Recording timer
  useEffect(() => {
    if (!recording) return;
    setRecordSecs(0);
    const i = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [recording]);

  const memberMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const visibleMessages = useMemo(
    () => (user ? messages.filter((m) => canSee(m, user.id)) : []),
    [messages, user],
  );

  if (!user || !conversation) {
    return (
      <div className="glass-strong flex flex-1 items-center justify-center rounded-none md:rounded-3xl">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const groupMembers = users.filter((u) => conversation.memberIds.includes(u.id) && u.id !== user.id);
  const otherDm = conversation.kind === "dm" ? users.find((u) => u.id === conversation.memberIds.find((m) => m !== user.id)) : null;

  // Parse mentions from draft (@username at any position, supported usernames only in this group)
  function parseMentions(text: string): { mentions: string[]; visibleTo?: string[] } {
    if (conversation?.kind !== "group") return { mentions: [] };
    const mentioned = new Set<string>();
    const re = /@([a-z0-9_]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const u = users.find((x) => x.username.toLowerCase() === match![1].toLowerCase() && conversation.memberIds.includes(x.id));
      if (u) mentioned.add(u.id);
    }
    const arr = Array.from(mentioned);
    return { mentions: arr, visibleTo: arr.length ? [...arr, user!.id] : undefined };
  }

  async function send(kind: Message["kind"] = "text", content?: string, attachment?: Message["attachment"]) {
    const text = content ?? draft.trim();
    if (kind === "text" && !text) return;
    const { mentions, visibleTo } = parseMentions(text || "");
    const msg = await api.sendMessage({
      conversationId: conversation!.id,
      authorId: user!.id,
      kind,
      content: text || "",
      mentions,
      visibleTo,
      attachment,
    });
    setMessages((m) => [...m, msg]);
    setDraft("");
    inputRef.current?.focus();
  }

  function onDraftChange(v: string) {
    setDraft(v);
    if (conversation?.kind === "group") {
      const lastAt = v.lastIndexOf("@");
      const after = lastAt >= 0 ? v.slice(lastAt + 1) : "";
      setShowMentionMenu(lastAt >= 0 && !after.includes(" "));
    }
  }

  function pickMention(u: User) {
    const lastAt = draft.lastIndexOf("@");
    const before = draft.slice(0, lastAt);
    const after = draft.slice(lastAt).replace(/^@\S*/, "");
    setDraft(`${before}@${u.username} ${after.trimStart()}`);
    setShowMentionMenu(false);
    inputRef.current?.focus();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    const url = URL.createObjectURL(f);
    send(
      isImage ? "image" : isVideo ? "video" : "file",
      isImage || isVideo ? "" : f.name,
      { name: f.name, url, size: f.size },
    );
    e.target.value = "";
  }

  function stopRecording() {
    setRecording(false);
    const dur = recordSecs;
    if (dur < 1) return;
    send("voice", "", { name: "voice.webm", url: "#", durationSec: dur });
  }

  return (
    <div className="glass-strong flex flex-1 flex-col rounded-none md:rounded-3xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-white/5 p-3 md:p-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/chat"
            className="rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Avatar
            name={conversation.name}
            color={conversation.kind === "group" ? "oklch(0.72 0.21 295)" : otherDm?.avatarColor}
            online={conversation.kind === "dm" ? otherDm?.online : undefined}
          />
          <div className="min-w-0">
            <div className="truncate font-display font-semibold">{conversation.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {conversation.kind === "group"
                ? `${conversation.memberIds.length} members`
                : otherDm?.online ? "online" : "offline"}
            </div>
          </div>
        </div>
        {conversation.kind === "group" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const url = `${window.location.origin}/join/${conversation.id}`;
                if (navigator.clipboard && window.isSecureContext) {
                  navigator.clipboard.writeText(url).then(() => {
                    alert("Invite link copied to clipboard!");
                  });
                } else {
                  prompt("Copy your invite link below:", url);
                }
              }}
              className="rounded-full p-2 text-accent hover:bg-white/5"
              title="Copy Invite Link"
            >
              <Users className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {visibleMessages.length === 0 && (
            <div className="my-auto py-12 text-center text-sm text-muted-foreground">
              No messages yet. Say hi 👋
            </div>
          )}
          <AnimatePresence initial={false}>
            {visibleMessages.map((m, i) => {
              const author = memberMap[m.authorId];
              const mine = m.authorId === user.id;
              const showAvatar = !mine && (i === 0 || visibleMessages[i - 1].authorId !== m.authorId);
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                >
                  {!mine && (
                    <div className="w-8">
                      {showAvatar && author && <Avatar name={author.name} color={author.avatarColor} size={32} />}
                    </div>
                  )}
                  <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {!mine && showAvatar && conversation.kind === "group" && author && (
                      <span className="ml-3 text-xs font-semibold text-accent">{author.name}</span>
                    )}
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        mine
                          ? "bg-aurora text-primary-foreground rounded-br-sm"
                          : "glass rounded-bl-sm"
                      } ${m.visibleTo ? "ring-1 ring-accent/50" : ""}`}
                    >
                      {m.visibleTo && (
                        <div className={`mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${mine ? "text-primary-foreground/70" : "text-accent"}`}>
                          <Lock className="h-3 w-3" />
                          Only {m.visibleTo.filter((id) => id !== user.id).map((id) => memberMap[id]?.name ?? "?").join(", ")} can see
                        </div>
                      )}
                      <MessageBody m={m} users={users} />
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {mine && (m.seenBy.length > 1 ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {typing && (
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <span>{typing} is typing</span>
              <span className="flex gap-0.5">
                <Dot delay={0} /><Dot delay={0.15} /><Dot delay={0.3} />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="relative border-t border-white/5 p-3 md:p-4">
        {showMentionMenu && conversation.kind === "group" && (
          <div className="glass-strong absolute bottom-full left-4 mb-2 max-h-52 w-64 overflow-auto rounded-2xl p-1 scrollbar-thin">
            {groupMembers
              .filter((u) => {
                const q = draft.slice(draft.lastIndexOf("@") + 1).toLowerCase();
                return u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
              })
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => pickMention(u)}
                  className="flex w-full items-center gap-2 rounded-xl p-2 hover:bg-white/5"
                >
                  <Avatar name={u.name} color={u.avatarColor} size={28} />
                  <div className="text-left">
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground">@{u.username}</div>
                  </div>
                </button>
              ))}
          </div>
        )}

        {recording ? (
          <div className="glass flex items-center gap-3 rounded-full px-4 py-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
            </span>
            <div className="flex-1 text-sm">Recording… {fmtDuration(recordSecs)}</div>
            <button
              onClick={() => setRecording(false)}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={stopRecording}
              className="bg-aurora flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground glow"
            >
              <Square className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="glass flex items-end gap-2 rounded-3xl p-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              title="Attach"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input ref={fileRef} type="file" hidden onChange={onFile} />
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={conversation.kind === "group" ? "Message — try @username for private send" : "Message"}
              rows={1}
              maxLength={2000}
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            {draft.trim() ? (
              <button
                onClick={() => send()}
                className="bg-aurora flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-foreground glow"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setRecording(true)}
                className="bg-aurora flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-foreground glow"
                title="Record voice"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSettings && conversation.kind === "group" && (
          <GroupSettings
            conversation={conversation}
            users={users}
            meId={user.id}
            onClose={() => setShowSettings(false)}
            onChanged={(c) => {
              setConversation(c);
              if (!c.memberIds.includes(user.id)) navigate({ to: "/chat" });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBody({ m, users }: { m: Message; users: User[] }) {
  if (m.kind === "image") {
    return (
      <img
        src={m.attachment?.url}
        alt={m.attachment?.name ?? "image"}
        className="max-h-72 rounded-xl object-cover"
      />
    );
  }
  if (m.kind === "video") {
    return <video src={m.attachment?.url} controls className="max-h-72 rounded-xl" />;
  }
  if (m.kind === "file") {
    return (
      <a href={m.attachment?.url} download={m.attachment?.name} className="flex items-center gap-2 underline-offset-2 hover:underline">
        <Paperclip className="h-4 w-4" />
        <span>{m.attachment?.name}</span>
      </a>
    );
  }
  if (m.kind === "voice") {
    return (
      <div className="flex items-center gap-3">
        <button className="bg-foreground/15 flex h-8 w-8 items-center justify-center rounded-full">
          <Mic className="h-4 w-4" />
        </button>
        <Waveform />
        <span className="text-xs opacity-80">{fmtDuration(m.attachment?.durationSec ?? 0)}</span>
      </div>
    );
  }
  // text — highlight mentions
  return <div className="whitespace-pre-wrap break-words">{renderMentions(m.content, users)}</div>;
}

function renderMentions(text: string, users: User[]) {
  const parts = text.split(/(@[a-z0-9_]+)/gi);
  return parts.map((p, i) => {
    if (p.startsWith("@")) {
      const u = users.find((x) => "@" + x.username.toLowerCase() === p.toLowerCase());
      if (u) {
        return (
          <span key={i} className="rounded bg-accent/20 px-1 font-semibold text-accent">
            @{u.username}
          </span>
        );
      }
    }
    return <span key={i}>{p}</span>;
  });
}

function Waveform() {
  const bars = Array.from({ length: 22 }, (_, i) => 6 + Math.sin(i * 1.3) * 8 + Math.random() * 4);
  return (
    <div className="flex items-end gap-0.5">
      {bars.map((h, i) => (
        <span key={i} className="w-0.5 rounded bg-current opacity-80" style={{ height: `${Math.abs(h) + 4}px` }} />
      ))}
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1 w-1 rounded-full bg-current"
      style={{ animation: `typing-bounce 1.2s ${delay}s infinite ease-in-out` }}
    />
  );
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}
