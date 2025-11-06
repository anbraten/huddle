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
  private localStream: MediaStream | null = null;
  private isMuted: boolean = false;
  private onSignal: (targetUserId: string, signal: SignalData) => void;

  // Simple ICE configuration - works for local network
  private iceConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  constructor(onSignal: (targetUserId: string, signal: SignalData) => void) {
    this.onSignal = onSignal;
  }

  public async initialize(): Promise<boolean> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      console.log("Audio initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to get audio access:", error);
      alert(
        "Microphone access is required for voice chat. Please allow microphone access and refresh."
      );
      return false;
    }
  }

  public async connectToPeer(userId: string, initiator: boolean) {
    // Don't create duplicate connections
    if (this.peers.has(userId)) {
      return;
    }

    if (!this.localStream) {
      console.error("Cannot connect: local stream not initialized");
      return;
    }

    console.log(
      `Creating peer connection to ${userId} (initiator: ${initiator})`
    );

    const pc = new RTCPeerConnection(this.iceConfig);

    // Add local stream to connection
    this.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
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
    if (this.localStream) {
      this.isMuted = !this.isMuted;
      this.localStream.getAudioTracks().forEach((track) => {
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
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}
