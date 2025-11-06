interface PeerConnection {
  connection: RTCPeerConnection;
  userId: string;
  audioElement?: HTMLAudioElement;
}

interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export class AudioManager {
  private peers: Map<string, PeerConnection> = new Map();
  private audioStream: MediaStream | null = null;
  private isMuted: boolean = false;
  private onSignal: (targetUserId: string, signal: SignalData) => void;
  private isInitializing: boolean = false;

  // Simple ICE configuration - works for local network
  private iceConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  constructor(onSignal: (targetUserId: string, signal: SignalData) => void) {
    this.onSignal = onSignal;
  }

  private async openAudioStream(): Promise<boolean> {
    // If already initialized, return true
    if (this.audioStream) {
      return true;
    }

    // If currently initializing, wait for it
    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.audioStream !== null;
    }

    // Initialize the stream
    this.isInitializing = true;
    try {
      console.log("Requesting microphone access...");
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      console.log("Microphone access granted");
      this.isInitializing = false;
      return true;
    } catch (error) {
      console.error("Failed to get audio access:", error);
      alert(
        "Microphone access is required for voice chat. Please allow microphone access."
      );
      this.isInitializing = false;
      return false;
    }
  }

  private async closeAudioStream() {
    if (this.audioStream) {
      console.log("Stopping microphone");
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
      this.isMuted = false; // Reset mute state
    }
  }

  public async connectToPeer(userId: string, initiator: boolean) {
    // Don't create duplicate connections
    if (this.peers.has(userId)) {
      return;
    }

    // Ensure we have microphone access before connecting
    const streamReady = await this.openAudioStream();
    if (!streamReady || !this.audioStream) {
      console.error("Cannot connect: failed to get microphone access");
      return;
    }

    console.log(
      `Creating peer connection to ${userId} (initiator: ${initiator})`
    );

    const pc = new RTCPeerConnection(this.iceConfig);

    // Add local stream to connection
    this.audioStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.audioStream!);
    });

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`Receiving stream from ${userId}`);
      const remoteStream = event.streams[0];
      this.playRemoteStream(userId, remoteStream);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal(userId, {
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}: ${pc.connectionState}`);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        this.disconnectFromPeer(userId);
      }
    };

    this.peers.set(userId, { connection: pc, userId });

    // If initiator, create and send offer
    if (initiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.onSignal(userId, {
          type: "offer",
          offer: pc.localDescription!.toJSON(),
        });
      } catch (error) {
        console.error(`Error creating offer for ${userId}:`, error);
        this.disconnectFromPeer(userId);
      }
    }
  }

  public async handleSignal(userId: string, signal: SignalData) {
    let peerConnection = this.peers.get(userId);

    // If we don't have a connection and receive an offer, create one
    if (!peerConnection && signal.type === "offer") {
      await this.connectToPeer(userId, false);
      peerConnection = this.peers.get(userId);
    }

    if (!peerConnection) {
      console.error(`No peer connection for ${userId}`);
      return;
    }

    const pc = peerConnection.connection;

    try {
      if (signal.type === "offer" && signal.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.onSignal(userId, {
          type: "answer",
          answer: pc.localDescription!.toJSON(),
        });
      } else if (signal.type === "answer" && signal.answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.type === "ice-candidate" && signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (error) {
      console.error(`Error handling signal from ${userId}:`, error);
    }
  }

  public disconnectFromPeer(userId: string) {
    const peerConnection = this.peers.get(userId);
    if (peerConnection) {
      console.log(`Disconnecting from ${userId}`);
      peerConnection.connection.close();
      if (peerConnection.audioElement) {
        peerConnection.audioElement.srcObject = null;
        peerConnection.audioElement.remove();
      }
      this.peers.delete(userId);

      // Stop local stream if no more peers are connected
      if (this.peers.size === 0 && this.audioStream) {
        console.log("No more peers connected, stopping microphone");
        this.closeAudioStream();
      }
    }
  }

  public disconnectAll() {
    console.log("Disconnecting all peers");
    this.peers.forEach((peerConnection) => {
      peerConnection.connection.close();
      if (peerConnection.audioElement) {
        peerConnection.audioElement.srcObject = null;
        peerConnection.audioElement.remove();
      }
    });
    this.peers.clear();
  }

  public toggleMute(): boolean {
    if (this.audioStream) {
      this.isMuted = !this.isMuted;
      this.audioStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
      console.log(`Microphone ${this.isMuted ? "muted" : "unmuted"}`);
    }
    return this.isMuted;
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  public isConnectedTo(userId: string): boolean {
    return this.peers.has(userId);
  }

  public getActiveConnections(): string[] {
    return Array.from(this.peers.keys());
  }

  private playRemoteStream(userId: string, stream: MediaStream) {
    const peerConnection = this.peers.get(userId);
    if (!peerConnection) return;

    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    peerConnection.audioElement = audio;

    audio.play().catch((err) => {
      console.error("Error playing remote audio:", err);
    });
  }

  public cleanup() {
    this.disconnectAll();
    if (this.audioStream) {
      this.closeAudioStream();
    }
  }
}
