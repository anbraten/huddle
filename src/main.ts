import "./style.css";
import { OfficeMap } from "./map";
import { AudioManager } from "./audio";
import { Renderer, type User } from "./renderer";
import { InputManager } from "./input";
import { NetworkManager } from "./network";
import { ProximityManager, type Cluster } from "./proximity";
import type { ServerMessage } from "../shared/types";

const LOCAL_STORAGE_PREFIX = "huddle";

class VirtualOffice {
  private canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;

  private network: NetworkManager;

  private input: InputManager;

  private proximityManager: ProximityManager;

  private currentUser: User | null = null;

  private users: Map<string, User> = new Map();

  private animationId: number | null = null;

  private map: OfficeMap | null = null;

  private audioManager: AudioManager | null = null;

  private renderer: Renderer | null = null;

  private connectedPeers: Set<string> = new Set();

  private clusters: Cluster[] = [];

  private readonly AVATAR_SIZE = 50;
  private readonly MOVE_SPEED = 5;
  private readonly MOVE_SPEED_FAST = 2;
  private readonly PROXIMITY_DISTANCE = 120;

  constructor() {
    this.canvas = document.getElementById("office-canvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.renderer = new Renderer(this.ctx);

    const serverUrl =
      new URLSearchParams(window.location.search).get("server") ??
      localStorage.getItem(`${LOCAL_STORAGE_PREFIX}:server`) ??
      undefined;
    if (serverUrl) {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}:server`, serverUrl);
    }

    this.network = new NetworkManager(serverUrl);
    this.proximityManager = new ProximityManager(this.PROXIMITY_DISTANCE);
    this.input = new InputManager();

    this.setupCanvas();

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

    // Set canvas buffer size (actual pixels, accounting for DPI)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Scale context to match DPI
    this.ctx.scale(dpr, dpr);

    // Initialize map with canvas dimensions
    this.map = new OfficeMap(width, height);
  }

  public async connect(username: string) {
    // Initialize audio manager
    this.audioManager = new AudioManager(
      (targetUserId: string, signal: any) => {
        // Send WebRTC signal through WebSocket
        this.network.sendWebRTCSignal(targetUserId, signal);
      }
    );

    // Setup network handlers
    this.network.setMessageHandler((message) => this.handleMessage(message));
    this.network.setDisconnectHandler(() => {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.audioManager?.cleanup();
    });

    // Connect to server
    try {
      await this.network.connect(username);
    } catch (error) {
      alert(String(error));
    }
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
          this.network.sendMove(this.currentUser.x, this.currentUser.y);
        }

        // Initialize users list with all existing users
        this.users.clear();
        message.users!.forEach((user) => {
          // Use spawn position for current user, server position for others
          if (user.id === this.currentUser!.id && this.map) {
            user.x = this.currentUser!.x;
            user.y = this.currentUser!.y;
          }
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
        // Disconnect audio if connected
        if (message.userId) {
          this.audioManager?.disconnectFromPeer(message.userId);
          this.connectedPeers.delete(message.userId);
        }
        break;

      case "webrtc-signal":
        // Handle WebRTC signaling
        if (message.fromUserId && message.signal) {
          this.audioManager?.handleSignal(message.fromUserId, message.signal);
        }
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

  private update() {
    if (!this.currentUser || !this.map) return;

    const oldX = this.currentUser.x;
    const oldY = this.currentUser.y;

    // Handle movement
    const moveSpeed = this.input.isSpeedBoostActive()
      ? this.MOVE_SPEED * this.MOVE_SPEED_FAST
      : this.MOVE_SPEED;

    // Try moving in each direction and check for collisions
    let newX = this.currentUser.x;
    let newY = this.currentUser.y;

    if (this.input.isMovingUp()) {
      newY = this.currentUser.y - moveSpeed;
    }
    if (this.input.isMovingDown()) {
      newY = this.currentUser.y + moveSpeed;
    }
    if (this.input.isMovingLeft()) {
      newX = this.currentUser.x - moveSpeed;
    }
    if (this.input.isMovingRight()) {
      newX = this.currentUser.x + moveSpeed;
    }

    const moved = this.input.isMoving();

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
      this.network.sendMove(this.currentUser.x, this.currentUser.y);
    }

    // Check proximity for voice connections
    this.updateVoiceConnections();
  }

  private updateVoiceConnections() {
    if (!this.currentUser || !this.audioManager) return;

    // Calculate all clusters based on proximity
    this.clusters = this.proximityManager.calculateClusters(this.users);

    // Get all users in the same cluster(s) as current user
    const usersInRange = this.proximityManager.getUsersInProximity(
      this.currentUser.id,
      this.clusters
    );

    // Connect to users in range
    usersInRange.forEach((userId) => {
      if (!this.connectedPeers.has(userId)) {
        // We initiate if our userId is lexicographically greater (prevents both sides initiating)
        const shouldInitiate = this.currentUser!.id > userId;
        this.audioManager!.connectToPeer(userId, shouldInitiate);
        this.connectedPeers.add(userId);
      }
    });

    // Disconnect from users out of range
    this.connectedPeers.forEach((userId) => {
      if (!usersInRange.has(userId)) {
        this.audioManager!.disconnectFromPeer(userId);
        this.connectedPeers.delete(userId);
      }
    });
  }

  private render() {
    if (!this.map || !this.renderer) return;

    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const width = this.canvas.width / (window.devicePixelRatio || 1);

    this.renderer.render({
      width,
      height,
      map: this.map,
      users: this.users,
      currentUser: this.currentUser,
      connectedPeers: this.connectedPeers,
      clusters: this.clusters,
    });
  }

  public disconnect() {
    this.network.disconnect();
    this.audioManager?.cleanup();
  }

  public toggleMute(): boolean {
    if (this.audioManager) {
      return this.audioManager.toggleMute();
    }
    return false;
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
const muteBtn = document.getElementById("mute-btn")!;
const muteIcon = document.getElementById("mute-icon")!;

let office: VirtualOffice | null = null;

const STORAGE_KEY = `${LOCAL_STORAGE_PREFIX}:username`;

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

muteBtn.addEventListener("click", () => {
  if (office) {
    const isMuted = office.toggleMute();
    muteIcon.textContent = isMuted ? "🔇" : "🎤";
    muteBtn.style.backgroundColor = isMuted ? "#EF4444" : "";
  }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  office?.disconnect();
});

// Load saved username and auto-focus
loadSavedUsername();
usernameInput.focus();
