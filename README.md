# 💬 Huddle

A beautiful, real-time virtual office application where you can walk around and interact with colleagues. Built with TypeScript, WebSockets, and HTML5 Canvas.

> [!NOTE]
> :robot: This project was crafted by help from AI systems. The code is perfect and should not be questioned in any way :wink:

## ✨ Features

- 🚶 **Walk around freely** - Use WASD or Arrow keys to navigate the office space
- 🏗️ **Structured office layout** - Navigate through different zones: Entry area, Meeting Room, and Open Office with realistic wall collision
- 👥 **See colleagues in real-time** - All users appear as colorful avatars with their names
- 🎙️ **Proximity-based voice chat** - Automatically connect to voice calls when you get close to colleagues using WebRTC
- 🔇 **Mute control** - Toggle your microphone on/off with a simple button
- 💬 **Proximity detection** - Get closer to someone and a chat bubble appears, indicating you're in conversation range
- 🔄 **Username persistence** - Your username is saved locally and auto-filled on return visits
- 🎨 **Modern, clean UI** - Gradient backgrounds, smooth animations, and glassmorphism effects
- ⚡ **Real-time updates** - WebSocket-based communication for instant position synchronization
- 🎯 **KISS principle** - Simple, straightforward codebase with minimal dependencies

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

```bash
# to start the backend server
pnpm server

# to start the UI
pnpm dev
```

This starts the Vite dev server (usually on http://localhost:5173). Vite will automatically proxy WebSocket connections to `/ws` to the backend server.

### Usage

1. Open your browser to the Vite dev server URL (e.g., http://localhost:5173)
2. **Allow microphone access** when prompted (required for voice chat)
3. Enter your name
4. Click "Join Office"
5. Use **WASD** or **Arrow Keys** to move around
6. **Walk close to other users** - Voice chat automatically connects when within range!
7. Use the **toolbar at the top** to:
   - Toggle mute/unmute with the 🎤 button
   - See how many users are online
8. A 🔊 speaker icon appears above users you're connected to

### Testing with Multiple Users

Open multiple browser tabs or windows to simulate multiple users in the office. Each tab will be a separate user that can move independently. **Note:** You'll hear audio feedback when testing with multiple tabs on the same computer - this is normal!

## 🏗️ Architecture

### Project Structure

```
virtual-office/
├── server/
│   └── index.ts          # WebSocket server with signaling
├── shared/
│   └── types.ts          # Shared TypeScript types
├── src/
│   ├── main.ts           # Main application orchestration
│   ├── renderer.ts       # Canvas rendering logic
│   ├── audio.ts          # WebRTC voice communication
│   ├── map.ts            # Office layout & collision detection
│   ├── input.ts          # Keyboard input handling
│   └── network.ts        # WebSocket communication
├── vite.config.ts        # Vite config with WebSocket proxy
└── package.json
```

### Backend (`server/index.ts`)

- Simple WebSocket server using the `ws` library
- In-memory user state management
- Broadcasts position updates to all connected clients
- Handles user join/leave events
- Relays WebRTC signaling for peer-to-peer voice connections

### Frontend (`src/main.ts`)

- Main application logic and game loop
- Coordinates between all subsystems
- Proximity-based voice connection management

### Frontend (`src/network.ts`)

- WebSocket client abstraction
- Connects to `/ws` endpoint (proxied by Vite in dev)
- Type-safe message handling

### Frontend (`src/input.ts`)

- Keyboard input management
- Movement and action detection

### Frontend (`src/renderer.ts`)

- Canvas rendering for users, avatars, and UI elements
- Proximity indicators and voice connection visuals
- Clean separation of rendering logic

### Frontend (`src/audio.ts`)

- Native WebRTC peer connection management
- Audio stream handling and routing
- Auto-connect/disconnect based on proximity
- Mute/unmute controls

### Frontend (`src/map.ts`)

- Office layout with walls and zones
- Collision detection system
- Spawn point management
- Modular design for easy layout modifications

### Key Components

- **VirtualOffice class**: Main application coordination and orchestration
- **NetworkManager class**: WebSocket communication abstraction
- **InputManager class**: Keyboard input handling
- **Renderer class**: All canvas drawing and visual effects
- **AudioManager class**: WebRTC voice communication
- **OfficeMap class**: Map layout, collision detection, and zone management
- **Shared Types**: Common interfaces used by both client and server

## 🎨 Design Features

- **Clean, unified toolbar**: All controls in one elegant, centered toolbar
- **Gradient backgrounds**: Beautiful purple gradients for visual appeal
- **Glassmorphism**: Translucent UI elements with backdrop blur
- **Smooth animations**: Fade-in effects and hover states
- **Structured office layout**: Different colored zones (Entry, Meeting Room, Open Office)
- **Realistic walls**: Collision detection prevents walking through walls
- **Color-coded avatars**: Each user gets a unique color
- **Shadow effects**: Depth and dimension with carefully crafted shadows
- **Voice indicators**: 🔊 speaker icon shows active voice connections

## 🔧 Technical Stack

- **TypeScript**: Type-safe code throughout
- **Vite**: Fast development and build tooling
- **WebSocket (ws)**: Real-time bidirectional communication
- **Native WebRTC APIs**: Peer-to-peer voice communication (no external libraries!)
- **HTML5 Canvas**: Hardware-accelerated 2D rendering
- **CSS3**: Modern styling with gradients, animations, and backdrop filters

## 🚀 Future Enhancements

Potential improvements to consider:

- **STUN/TURN servers**: Enable voice chat across different networks (currently local network only)
- **Group conversations**: Support multiple people talking at once
- **Video support**: Add optional video streams
- **More rooms**: Expand the office layout with additional zones
- **Persistent user data**: Save user positions and preferences
- **Chat messages**: Text-based communication alongside voice
- **Screen sharing**: Share your screen with nearby colleagues
- **Custom avatars**: Allow users to upload or customize their avatars

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
