import type { ServerMessage } from "../shared/types";

type MessageHandler = (message: ServerMessage) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private messageHandler: MessageHandler | null = null;
  private onDisconnect: (() => void) | null = null;
  private serverUrl: string;

  constructor(serverUrl?: string) {
    // Use /ws path which will be proxied by Vite in dev, or use provided URL
    const defaultUrl = location.origin.replace(/^http/, "ws") + "/ws";
    this.serverUrl = serverUrl ?? defaultUrl;
  }

  public connect(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log("Connected to server");
        this.send({ type: "join", name: username });
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message: ServerMessage = JSON.parse(event.data);
        this.messageHandler?.(message);
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(
          new Error(
            `Failed to connect to server. Make sure the server is at ${this.serverUrl}`
          )
        );
      };

      this.ws.onclose = () => {
        console.log("Disconnected from server");
        this.onDisconnect?.();
      };
    });
  }

  public setMessageHandler(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  public setDisconnectHandler(handler: () => void) {
    this.onDisconnect = handler;
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public sendMove(x: number, y: number) {
    this.send({ type: "move", x, y });
  }

  public sendWebRTCSignal(targetUserId: string, signal: any) {
    this.send({
      type: "webrtc-signal",
      targetUserId,
      signal,
    });
  }

  public disconnect() {
    if (this.ws) {
      this.send({ type: "leave" });
      this.ws.close();
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
