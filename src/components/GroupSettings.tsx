import { useState } from "react";
import { motion } from "framer-motion";
import { X, Crown, UserPlus, UserMinus, Shield } from "lucide-react";
import { Avatar } from "./Avatar";
import { api } from "@/lib/api";
import type { Conversation, User } from "@/lib/types";

interface Props {
  conversation: Conversation;
  users: User[];
  meId: string;
  onClose: () => void;
  onChanged: (c: Conversation) => void;
}

export function GroupSettings({ conversation, users, meId, onClose, onChanged }: Props) {
  const [adding, setAdding] = useState(false);
  const isAdmin = conversation.adminIds.includes(meId);
  const members = users.filter((u) => conversation.memberIds.includes(u.id));
  const nonMembers = users.filter((u) => !conversation.memberIds.includes(u.id));

  async function remove(id: string) {
    const c = await api.updateMembers(conversation.id, { remove: [id] });
    onChanged(c);
  }
  async function add(id: string) {
    const c = await api.updateMembers(conversation.id, { add: [id] });
    onChanged(c);
    setAdding(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-stretch justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong flex w-full max-w-sm flex-col rounded-none md:my-2 md:mr-2 md:rounded-3xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="font-display text-lg font-semibold">Group info</h3>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 p-6">
          <Avatar name={conversation.name} size={72} />
          <div className="font-display text-xl font-bold">{conversation.name}</div>
          <div className="text-xs text-muted-foreground">{conversation.memberIds.length} members</div>
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Members</div>
          {isAdmin && (
            <button
              onClick={() => setAdding((v) => !v)}
              className="text-aurora flex items-center gap-1 text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5" /> {adding ? "Done" : "Add"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2 scrollbar-thin">
          {adding && (
            <div className="mb-2 rounded-2xl bg-white/5 p-2">
              {nonMembers.length === 0 && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">No one to add.</div>
              )}
              {nonMembers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => add(u.id)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-white/5"
                >
                  <Avatar name={u.name} color={u.avatarColor} size={32} />
                  <div className="flex-1 text-left">
                    <div className="text-sm">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground">@{u.username}</div>
                  </div>
                  <UserPlus className="h-4 w-4 text-accent" />
                </button>
              ))}
            </div>
          )}
          {members.map((u) => {
            const admin = conversation.adminIds.includes(u.id);
            const isMe = u.id === meId;
            return (
              <div key={u.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5">
                <Avatar name={u.name} color={u.avatarColor} online={u.online} size={36} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {isMe ? "You" : u.name}
                    {admin && <Crown className="h-3.5 w-3.5 text-accent" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground">@{u.username}</div>
                </div>
                {isAdmin && !isMe && (
                  <button
                    onClick={() => remove(u.id)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    title="Remove"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/5 p-4">
          <button
            onClick={() => remove(meId)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20"
          >
            <Shield className="h-4 w-4" /> Leave group
          </button>
        </div>
      </motion.aside>
    </motion.div>
  );
}
