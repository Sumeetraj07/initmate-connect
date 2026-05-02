export type ID = string;

export interface User {
  id: ID;
  username: string;
  name: string;
  avatarColor: string;
  online?: boolean;
}

export type MessageKind = "text" | "image" | "video" | "file" | "voice";

export interface Message {
  id: ID;
  conversationId: ID;
  authorId: ID;
  kind: MessageKind;
  content: string;
  /** if set, only these user IDs may see this message (selective @mention) */
  visibleTo?: ID[];
  mentions?: ID[];
  createdAt: number;
  seenBy: ID[];
  attachment?: {
    name: string;
    url: string;
    size?: number;
    durationSec?: number;
  };
}

export interface Conversation {
  id: ID;
  kind: "dm" | "group";
  name: string;
  memberIds: ID[];
  adminIds: ID[];
  lastMessageAt: number;
  lastPreview: string;
  unread: number;
}
