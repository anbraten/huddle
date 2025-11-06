export interface User {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

export interface ClientMessage {
  type: "join" | "move" | "leave" | "webrtc-signal";
  name?: string;
  x?: number;
  y?: number;
  targetUserId?: string;
  signal?: any;
}

export interface ServerMessage {
  type:
    | "init"
    | "users"
    | "user-joined"
    | "user-moved"
    | "user-left"
    | "webrtc-signal";
  userId?: string;
  user?: User;
  users?: User[];
  fromUserId?: string;
  signal?: any;
}
