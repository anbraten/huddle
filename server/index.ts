import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import type { User, ClientMessage, ServerMessage } from "../shared/types";

const users = new Map<string, User>();
const connections = new Map<string, WebSocket>();

const server = createServer();
const wss = new WebSocketServer({ server });

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateColor(): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function broadcast(message: ServerMessage, excludeId?: string) {
  const data = JSON.stringify(message);
  connections.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

wss.on("connection", (ws: WebSocket) => {
  let userId: string | null = null;

  ws.on("message", (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case "join":
          userId = generateId();
          const user: User = {
            id: userId,
            name: message.name || `User${users.size + 1}`,
            // Users will spawn in client's entry zone (handled by map)
            x: 0,
            y: 0,
            color: generateColor(),
          };

          users.set(userId, user);
          connections.set(userId, ws);

          // Send init to the new user
          ws.send(
            JSON.stringify({
              type: "init",
              userId,
              user,
              users: Array.from(users.values()),
            })
          );

          // Notify others
          broadcast(
            {
              type: "user-joined",
              user,
            },
            userId
          );

          console.log(`User ${user.name} joined (${userId})`);
          break;

        case "move":
          if (userId && users.has(userId)) {
            const user = users.get(userId)!;
            user.x = message.x!;
            user.y = message.y!;

            broadcast(
              {
                type: "user-moved",
                user,
              },
              userId
            );
          }
          break;

        case "leave":
          if (userId) {
            users.delete(userId);
            connections.delete(userId);
            broadcast({
              type: "user-left",
              userId,
            } as ServerMessage);
            console.log(`User left (${userId})`);
          }
          break;

        case "webrtc-signal":
          // Relay WebRTC signaling messages between peers
          if (userId && message.targetUserId && message.signal) {
            const targetWs = connections.get(message.targetUserId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(
                JSON.stringify({
                  type: "webrtc-signal",
                  fromUserId: userId,
                  signal: message.signal,
                })
              );
            }
          }
          break;
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  });

  ws.on("close", () => {
    if (userId) {
      users.delete(userId);
      connections.delete(userId);
      broadcast({
        type: "user-left",
        userId,
      } as ServerMessage);
      console.log(`User disconnected (${userId})`);
    }
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
server.listen(PORT, () => {
  console.log(`🚀 Virtual Office server running on port ${PORT}`);
});
