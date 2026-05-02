import { useState } from "react";
import { motion } from "framer-motion";
import { X, Users } from "lucide-react";
import { Avatar } from "./Avatar";
import { api } from "@/lib/api";
import type { Conversation, User } from "@/lib/types";

interface Props {
  users: User[];
  onClose: () => void;
  onCreated: (c: Conversation) => void;
}

export function NewGroupDialog({ users, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function create() {
    setError("");
    if (!name.trim()) { setError("Name your group."); return; }
    if (selected.size === 0) { setError("Add at least one member."); return; }
    setBusy(true);
    try {
      const c = await api.createGroup({ name: name.trim().slice(0, 60), memberIds: Array.from(selected) });
      onCreated(c);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong w-full max-w-md rounded-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-aurora flex h-8 w-8 items-center justify-center rounded-lg">
              <Users className="h-4 w-4 text-primary-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold">New group</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          maxLength={60}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-primary"
        />

        <div className="mt-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Members</div>
          <div className="max-h-72 space-y-1 overflow-auto pr-1 scrollbar-thin">
            {users.map((u) => {
              const on = selected.has(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition ${on ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-white/5"}`}
                >
                  <Avatar name={u.name} color={u.avatarColor} online={u.online} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                  <span className={`h-5 w-5 rounded-md border ${on ? "bg-aurora border-transparent" : "border-white/20"}`}>
                    {on && <span className="block h-full w-full rounded-md text-center text-xs font-bold leading-5 text-primary-foreground">✓</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <div className="mt-3 text-sm text-destructive">{error}</div>}

        <button
          onClick={create}
          disabled={busy}
          className="bg-aurora glow mt-5 w-full rounded-xl py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create group"}
        </button>
      </motion.div>
    </div>
  );
}
