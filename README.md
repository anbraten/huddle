# 🏢 Virtual Office

A beautiful, real-time virtual office application where you can walk around and interact with colleagues. Built with TypeScript, WebSockets, and HTML5 Canvas.

## ✨ Features

- 🚶 **Walk around freely** - Use WASD or Arrow keys to navigate the office space
- 🏗️ **Structured office layout** - Navigate through different zones: Entry area, Meeting Room, and Open Office with realistic wall collision
- 👥 **See colleagues in real-time** - All users appear as colorful avatars with their names
- 💬 **Proximity detection** - Get closer to someone and a chat bubble appears, indicating you're in conversation range
- 🔄 **Username persistence** - Your username is saved locally and auto-filled on return visits
- 🎨 **Modern, clean UI** - Gradient backgrounds, smooth animations, and glassmorphism effects
- ⚡ **Real-time updates** - WebSocket-based communication for instant position synchronization
- 🎯 **KISS principle** - Simple, straightforward codebase with no unnecessary dependencies

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (or npm/yarn)

### Installation

1. Install dependencies:

```bash
pnpm install
```

### Running the Application

You need to run **two terminals** - one for the backend server and one for the frontend:

**Terminal 1 - Backend Server:**

```bash
pnpm server
```

This starts the WebSocket server on port 3001.

**Terminal 2 - Frontend:**

```bash
pnpm dev
```

This starts the Vite dev server (usually on http://localhost:5173).

### Usage

1. Open your browser to the Vite dev server URL (e.g., http://localhost:5173)
2. Enter your name
3. Click "Join Office"
4. Use **WASD** or **Arrow Keys** to move around
5. Get close to other users (within the proximity range) to see chat bubbles appear!

### Testing with Multiple Users

Open multiple browser tabs or windows to simulate multiple users in the office. Each tab will be a separate user that can move independently.

## 🏗️ Architecture

### Backend (`server.ts`)

- Simple WebSocket server using the `ws` library
- In-memory user state management
- Broadcasts position updates to all connected clients
- Handles user join/leave events

### Frontend (`src/main.ts`)

- HTML5 Canvas for rendering
- WebSocket client for real-time communication
- Keyboard input handling
- Smooth animation loop using `requestAnimationFrame`

### Frontend (`src/map.ts`)

- Office layout with walls and zones
- Collision detection system
- Spawn point management
- Modular design for easy layout modifications

### Key Components

- **VirtualOffice class**: Main application logic, rendering, and WebSocket handling
- **OfficeMap class**: Map layout, collision detection, and zone management
- **User interface**: Clean login screen and immersive office canvas
- **Proximity detection**: Calculates distance between users and shows interaction indicators

## 🎨 Design Features

- **Gradient backgrounds**: Beautiful purple gradients for visual appeal
- **Glassmorphism**: Translucent UI elements with backdrop blur
- **Smooth animations**: Fade-in effects and hover states
- **Structured office layout**: Different colored zones (Entry, Meeting Room, Open Office)
- **Realistic walls**: Collision detection prevents walking through walls
- **Color-coded avatars**: Each user gets a unique color
- **Shadow effects**: Depth and dimension with carefully crafted shadows

## 🔧 Technical Stack

- **TypeScript**: Type-safe code throughout
- **Vite**: Fast development and build tooling
- **WebSocket (ws)**: Real-time bidirectional communication
- **HTML5 Canvas**: Hardware-accelerated 2D rendering
- **CSS3**: Modern styling with gradients, animations, and backdrop filters

## 🚀 Future Enhancements (WebRTC for voice calls)

The current implementation includes proximity detection with visual indicators. To add actual voice calls:

1. Integrate a WebRTC library (e.g., simple-peer)
2. When users are in proximity, initiate a peer connection
3. Handle audio streams and connect them
4. Add mute/unmute controls
5. Support group conversations when multiple users are nearby

## 📝 License

MIT - Feel free to use this project however you like!

## 🙏 Contributing

This is a simple demonstration project. Feel free to fork and extend it with additional features like:

- Voice/video calls using WebRTC
- Chat messages
- Office rooms and zones
- User status indicators
- Screen sharing
- Persistent user data
