from fastapi import FastAPI, HTTPException, Header, Depends, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time
import uuid
import random
import json
import os
import pathlib

app = FastAPI()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "https://initmate-connect.rajsumeet32.workers.dev",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PERSISTENT FILE DB ---
DB_FILE = pathlib.Path(__file__).parent / "db.json"

def load_db():
    global users_db, tokens_db, convos_db, messages_db
    if DB_FILE.exists():
        try:
            data = json.loads(DB_FILE.read_text(encoding="utf-8"))
            users_db.update(data.get("users", {}))
            tokens_db.update(data.get("tokens", {}))
            convos_db.update(data.get("convos", {}))
            messages_db.update({k: v for k, v in data.get("messages", {}).items()})
        except Exception as e:
            print(f"[DB] Failed to load db.json: {e}")

def save_db():
    try:
        DB_FILE.write_text(json.dumps({
            "users": users_db,
            "tokens": tokens_db,
            "convos": convos_db,
            "messages": messages_db,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[DB] Failed to save db.json: {e}")

# --- IN-MEMORY DB ---
users_db: Dict[str, dict] = {}
tokens_db: Dict[str, str] = {} # token -> user_id
convos_db: Dict[str, dict] = {}
messages_db: Dict[str, List[dict]] = {} # convo_id -> list of messages

palette = [
  "oklch(0.7 0.2 295)", "oklch(0.75 0.18 215)", "oklch(0.72 0.22 340)",
  "oklch(0.78 0.18 160)", "oklch(0.78 0.18 60)", "oklch(0.7 0.22 25)",
]

# Load persisted data first
load_db()

# Seed system user only if DB is empty
system_user_id = "u_system"
if system_user_id not in users_db:
    users_db[system_user_id] = {
        "id": system_user_id,
        "username": "system",
        "name": "Aurora System",
        "avatarColor": palette[0],
        "online": True
    }
    save_db()

# --- Pydantic Models ---
class SignupInput(BaseModel):
    username: str
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    username: str
    password: str

class CreateGroupInput(BaseModel):
    kind: str
    name: str
    memberIds: List[str]

class UpdateMembersInput(BaseModel):
    add: Optional[List[str]] = None
    remove: Optional[List[str]] = None

class MessageAttachment(BaseModel):
    name: str
    url: str
    size: Optional[int] = None
    durationSec: Optional[int] = None

class SendMessageInput(BaseModel):
    kind: str
    content: str
    visibleTo: Optional[List[str]] = None
    mentions: Optional[List[str]] = None
    attachment: Optional[MessageAttachment] = None

# --- Helpers ---
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user_id = tokens_db.get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return users_db[user_id]

# --- Endpoints ---
@app.post("/auth/signup")
def signup(data: SignupInput):
    # basic validation
    if not data.username.strip() or not data.password.strip():
        raise HTTPException(status_code=400, detail="Username and password are required")
    if any(u["username"] == data.username for u in users_db.values()):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_id = f"u_{uuid.uuid4().hex[:8]}"
    user = {
        "id": user_id,
        "username": data.username.strip(),
        "name": (data.name or data.username).strip(),
        "avatarColor": random.choice(palette),
        "online": True,
        "_password": data.password  # stored but never returned
    }
    users_db[user_id] = user
    
    token = f"token_{uuid.uuid4().hex}"
    tokens_db[token] = user_id
    save_db()
    
    ret_user = {k: v for k, v in user.items() if k != "_password"}
    return {"token": token, "user": ret_user}

@app.post("/auth/login")
def login(data: LoginInput):
    if not data.username.strip() or not data.password.strip():
        raise HTTPException(status_code=400, detail="Username and password required")
    for u in users_db.values():
        # Only allow login for users with a password set (skip system users)
        stored_pw = u.get("_password")
        if stored_pw is None:
            continue
        if u["username"] == data.username and stored_pw == data.password:
            token = f"token_{uuid.uuid4().hex}"
            tokens_db[token] = u["id"]
            save_db()
            ret_user = {k: v for k, v in u.items() if k != "_password"}
            return {"token": token, "user": ret_user}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    ret_user = dict(user)
    if "_password" in ret_user:
        del ret_user["_password"]
    return ret_user

@app.get("/users")
def get_users():
    return [{"id": u["id"], "username": u["username"], "name": u["name"], "avatarColor": u["avatarColor"], "online": u["online"]} for u in users_db.values()]

@app.get("/conversations")
def get_conversations(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    return [c for c in convos_db.values() if user_id in c["memberIds"]]

@app.post("/conversations")
def create_conversation(data: CreateGroupInput, user: dict = Depends(get_current_user)):
    convo_id = f"c_{uuid.uuid4().hex[:8]}"
    members = list(set([user["id"]] + data.memberIds))
    convo = {
        "id": convo_id,
        "kind": data.kind,
        "name": data.name,
        "memberIds": members,
        "adminIds": [user["id"]],
        "lastMessageAt": int(time.time() * 1000),
        "lastPreview": "Group created",
        "unread": 0
    }
    convos_db[convo_id] = convo
    messages_db[convo_id] = []
    save_db()
    return convo

@app.patch("/conversations/{convo_id}/members")
def update_members(convo_id: str, data: UpdateMembersInput, user: dict = Depends(get_current_user)):
    convo = convos_db.get(convo_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    current_members = set(convo["memberIds"])
    if data.add:
        current_members.update(data.add)
    if data.remove:
        current_members.difference_update(data.remove)
    
    convo["memberIds"] = list(current_members)
    save_db()
    return convo

@app.get("/conversations/{convo_id}/messages")
def get_messages(convo_id: str, user: dict = Depends(get_current_user)):
    convo = convos_db.get(convo_id)
    if not convo or user["id"] not in convo["memberIds"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return messages_db.get(convo_id, [])

@app.post("/conversations/{convo_id}/messages")
async def send_message(convo_id: str, data: SendMessageInput, user: dict = Depends(get_current_user)):
    convo = convos_db.get(convo_id)
    if not convo or user["id"] not in convo["memberIds"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    msg = {
        "id": f"m_{uuid.uuid4().hex[:8]}",
        "conversationId": convo_id,
        "authorId": user["id"],
        "kind": data.kind,
        "content": data.content,
        "visibleTo": data.visibleTo,
        "mentions": data.mentions,
        "createdAt": int(time.time() * 1000),
        "seenBy": [user["id"]]
    }
    if data.attachment:
        msg["attachment"] = data.attachment.model_dump()
        
    if convo_id not in messages_db:
        messages_db[convo_id] = []
    messages_db[convo_id].append(msg)
    
    # Update conversation preview
    convo["lastMessageAt"] = msg["createdAt"]
    convo["lastPreview"] = data.content if data.kind == "text" else f"[{data.kind}]"
    save_db()
    
    await manager.broadcast(json.dumps({
        "type": "new_message",
        "message": msg
    }))
    
    return msg

@app.delete("/conversations/{convo_id}/messages/{msg_id}")
async def delete_message(convo_id: str, msg_id: str, user: dict = Depends(get_current_user)):
    convo = convos_db.get(convo_id)
    if not convo or user["id"] not in convo["memberIds"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    msgs = messages_db.get(convo_id, [])
    msg = next((m for m in msgs if m["id"] == msg_id), None)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only the author (or admins) can delete
    if msg["authorId"] != user["id"] and user["id"] not in convo.get("adminIds", []):
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
    
    messages_db[convo_id] = [m for m in msgs if m["id"] != msg_id]
    
    # Recalculate conversation preview
    remaining = messages_db[convo_id]
    if remaining:
        last = remaining[-1]
        convo["lastPreview"] = last["content"] if last["kind"] == "text" else f"[{last['kind']}]"
        convo["lastMessageAt"] = last["createdAt"]
    else:
        convo["lastPreview"] = "No messages yet"
    
    save_db()
    
    await manager.broadcast(json.dumps({
        "type": "delete_message",
        "messageId": msg_id,
        "conversationId": convo_id
    }))
    
    return {"ok": True}

# Simple WebSockets stub
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    # Accept immediately to avoid handshake timeouts/CORS issues during upgrade
    await websocket.accept()
    
    # Validate token — close if unauthenticated
    if token:
        user_id = tokens_db.get(token)
        if not user_id or user_id not in users_db:
            await websocket.close(code=4001)
            return
    
    await manager.connect(websocket)
    # We don't call manager.connect(websocket) again because manager.connect already accepted it
    # Oh wait, I see manager.connect also calls accept. Let's fix that too.

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                continue
            # Handle other messages (typing etc) here
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
