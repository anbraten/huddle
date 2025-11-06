import "./style.css";
import { OfficeMap } from "./map";

interface User {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

interface ServerMessage {
  type: "init" | "users" | "user-joined" | "user-moved" | "user-left";
  userId?: string;
  user?: User;
  users?: User[];
}

class VirtualOffice {
  private canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;

  private ws: WebSocket | null = null;

  private currentUser: User | null = null;

  private users: Map<string, User> = new Map();

  private keys: Set<string> = new Set();

  private animationId: number | null = null;

  private map: OfficeMap | null = null;

  private readonly AVATAR_SIZE = 50;
  private readonly MOVE_SPEED = 5;
  private readonly MOVE_SPEED_FAST = 2;
  private readonly PROXIMITY_DISTANCE = 120;

  constructor() {
    this.canvas = document.getElementById("office-canvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;

    this.setupCanvas();
    this.setupKeyboardControls();

    // Handle window resize
    window.addEventListener("resize", () => this.setupCanvas());
  }

  private setupCanvas() {
    const parent = this.canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;

    // Get parent dimensions
    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Set canvas display size (CSS pixels)
    // this.canvas.style.width = `${width}px`;
    // this.canvas.style.height = `${height}px`;

    // Set canvas buffer size (actual pixels, accounting for DPI)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Scale context to match DPI
    this.ctx.scale(dpr, dpr);

    // Initialize map with canvas dimensions
    this.map = new OfficeMap(width, height);
  }

  private setupKeyboardControls() {
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowleft",
          "arrowdown",
          "arrowright",
          "shift",
        ].includes(key)
      ) {
        e.preventDefault();
        this.keys.add(key);
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();
      this.keys.delete(key);
    });
  }

  public connect(username: string) {
    this.ws = new WebSocket("ws://localhost:3001");

    this.ws.onopen = () => {
      console.log("Connected to server");
      this.ws!.send(JSON.stringify({ type: "join", name: username }));
    };

    this.ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      alert(
        "Failed to connect to server. Make sure the server is running on port 3001."
      );
    };

    this.ws.onclose = () => {
      console.log("Disconnected from server");
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    };
  }

  private handleMessage(message: ServerMessage) {
    switch (message.type) {
      case "init":
        this.currentUser = message.user!;

        // Set spawn position from map
        if (this.map) {
          const spawnPos = this.map.getRandomSpawnPosition();
          this.currentUser.x = spawnPos.x;
          this.currentUser.y = spawnPos.y;

          // Send initial position to server
          this.ws?.send(
            JSON.stringify({
              type: "move",
              x: this.currentUser.x,
              y: this.currentUser.y,
            })
          );
        }

        this.users.clear();
        message.users!.forEach((user) => {
          this.users.set(user.id, user);
        });
        this.startGameLoop();
        break;

      case "user-joined":
        this.users.set(message.user!.id, message.user!);
        this.updateUserCount();
        break;

      case "user-moved":
        if (message.user) {
          this.users.set(message.user.id, message.user);
        }
        break;

      case "user-left":
        this.users.delete(message.userId!);
        this.updateUserCount();
        break;
    }
  }

  private updateUserCount() {
    const count = this.users.size;
    const userCountEl = document.getElementById("user-count")!;
    userCountEl.textContent = `${count} user${count !== 1 ? "s" : ""} online`;
  }

  private startGameLoop() {
    this.updateUserCount();
    const loop = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private height() {
    return this.canvas.height / (window.devicePixelRatio || 1);
  }

  private width() {
    return this.canvas.width / (window.devicePixelRatio || 1);
  }

  private update() {
    if (!this.currentUser || !this.map) return;

    let moved = false;
    const oldX = this.currentUser.x;
    const oldY = this.currentUser.y;

    // Handle movement
    const moveSpeed = this.keys.has("shift")
      ? this.MOVE_SPEED * this.MOVE_SPEED_FAST
      : this.MOVE_SPEED;

    // Try moving in each direction and check for collisions
    let newX = this.currentUser.x;
    let newY = this.currentUser.y;

    if (this.keys.has("w") || this.keys.has("arrowup")) {
      newY = this.currentUser.y - moveSpeed;
      moved = true;
    }
    if (this.keys.has("s") || this.keys.has("arrowdown")) {
      newY = this.currentUser.y + moveSpeed;
      moved = true;
    }
    if (this.keys.has("a") || this.keys.has("arrowleft")) {
      newX = this.currentUser.x - moveSpeed;
      moved = true;
    }
    if (this.keys.has("d") || this.keys.has("arrowright")) {
      newX = this.currentUser.x + moveSpeed;
      moved = true;
    }

    // Apply movement only if no collision
    if (moved) {
      const radius = this.AVATAR_SIZE / 2;

      // Check X movement
      if (!this.map.checkCollision(newX, this.currentUser.y, radius)) {
        this.currentUser.x = newX;
      }

      // Check Y movement
      if (!this.map.checkCollision(this.currentUser.x, newY, radius)) {
        this.currentUser.y = newY;
      }
    }

    // Send position update if moved
    if (moved && (oldX !== this.currentUser.x || oldY !== this.currentUser.y)) {
      this.users.set(this.currentUser.id, this.currentUser);
      this.ws?.send(
        JSON.stringify({
          type: "move",
          x: this.currentUser.x,
          y: this.currentUser.y,
        })
      );
    }
  }

  private render() {
    if (!this.map) return;

    // Clear canvas
    this.ctx.fillStyle = "#F8FAFC";
    this.ctx.fillRect(0, 0, this.width(), this.height());

    // Draw map (zones and walls)
    this.map.render(this.ctx);

    // Draw all users
    this.users.forEach((user) => {
      const isCurrentUser = user.id === this.currentUser?.id;
      this.drawUser(user, isCurrentUser);

      // Check proximity to current user
      if (!isCurrentUser && this.currentUser) {
        const distance = this.getDistance(this.currentUser, user);
        if (distance < this.PROXIMITY_DISTANCE) {
          this.drawProximityIndicator(user, distance);
        }
      }
    });
  }

  private drawUser(user: User, isCurrentUser: boolean) {
    const ctx = this.ctx;
    // const size = isCurrentUser ? this.AVATAR_SIZE + 10 : this.AVATAR_SIZE;
    const size = this.AVATAR_SIZE;

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    // Draw avatar circle
    ctx.beginPath();
    ctx.arc(user.x, user.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = user.color;
    ctx.fill();

    // Border
    ctx.lineWidth = isCurrentUser ? 4 : 3;
    ctx.strokeStyle = isCurrentUser ? "#FFF" : "rgba(255, 255, 255, 0.8)";
    ctx.stroke();

    ctx.restore();

    // Draw initial
    ctx.fillStyle = "#FFF";
    ctx.font = `bold ${size / 2}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initial = user.name.charAt(0).toUpperCase();
    ctx.fillText(initial, user.x, user.y);

    // Draw name label
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Background for name
    const nameWidth = ctx.measureText(user.name).width + 16;
    const nameHeight = 24;
    const nameX = user.x - nameWidth / 2;
    const nameY = user.y + size / 2 + 10;

    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 8;
    this.roundRect(nameX, nameY, nameWidth, nameHeight, 8);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = isCurrentUser ? user.color : "#64748B";
    ctx.fillText(user.name, user.x, nameY + 5);
  }

  private drawProximityIndicator(user: User, distance: number) {
    const ctx = this.ctx;
    const alpha = 1 - distance / this.PROXIMITY_DISTANCE;

    // Draw connection line
    ctx.save();
    ctx.strokeStyle = `rgba(102, 126, 234, ${alpha * 0.3})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.currentUser!.x, this.currentUser!.y);
    ctx.lineTo(user.x, user.y);
    ctx.stroke();
    ctx.restore();

    // Draw interaction bubble
    const bubbleY = user.y - this.AVATAR_SIZE / 2 - 40;
    ctx.save();
    ctx.fillStyle = `rgba(102, 126, 234, ${alpha * 0.95})`;
    ctx.shadowColor = "rgba(102, 126, 234, 0.4)";
    ctx.shadowBlur = 10;

    this.roundRect(user.x - 40, bubbleY, 80, 32, 16);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💬", user.x, bubbleY + 16);

    ctx.restore();
  }

  private roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private getDistance(user1: User, user2: User): number {
    const dx = user1.x - user2.x;
    const dy = user1.y - user2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "leave" }));
      this.ws.close();
    }
  }
}

// Application initialization
const loginScreen = document.getElementById("login-screen")!;
const officeScreen = document.getElementById("office-screen")!;
const usernameInput = document.getElementById(
  "username-input"
) as HTMLInputElement;
const joinBtn = document.getElementById("join-btn")!;
const welcomeBackMsg = document.getElementById("welcome-back")!;
const changeNameBtn = document.getElementById("change-name-btn")!;

let office: VirtualOffice | null = null;

const STORAGE_KEY = "virtual-office-username";

// Load saved username on page load
function loadSavedUsername() {
  const savedUsername = localStorage.getItem(STORAGE_KEY);
  if (savedUsername) {
    usernameInput.value = savedUsername;
    welcomeBackMsg.textContent = `Welcome back, ${savedUsername}!`;
    welcomeBackMsg.style.display = "block";
    changeNameBtn.style.display = "inline-block";
  }
}

// Clear saved username
function clearUsername() {
  usernameInput.value = "";
  usernameInput.focus();
  welcomeBackMsg.style.display = "none";
  changeNameBtn.style.display = "none";
  localStorage.removeItem(STORAGE_KEY);
}

function joinOffice() {
  const username = usernameInput.value.trim();

  if (!username) {
    usernameInput.focus();
    usernameInput.style.borderColor = "#EF4444";
    setTimeout(() => {
      usernameInput.style.borderColor = "";
    }, 1000);
    return;
  }

  // Save username to localStorage
  localStorage.setItem(STORAGE_KEY, username);

  // Hide login screen and show office
  loginScreen.style.display = "none";
  officeScreen.style.display = "flex";

  // Initialize office
  office = new VirtualOffice();
  office.connect(username);
}

joinBtn.addEventListener("click", joinOffice);
usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    joinOffice();
  }
});

changeNameBtn.addEventListener("click", (e) => {
  e.preventDefault();
  clearUsername();
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  office?.disconnect();
});

// Load saved username and auto-focus
loadSavedUsername();
usernameInput.focus();
