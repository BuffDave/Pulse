export type DescType = "offer" | "answer" | "ice";
export type PeerControl =
  | "video-request"
  | "video-accept"
  | "video-decline"
  | "video-busy"
  | "video-end";

interface PeerCallbacks {
  onSignal: (type: DescType, payload: string) => void;
  onChat: (text: string, nonce: string) => void;
  onReaction: (nonce: string, emoji: string) => void;
  onUnreaction: (nonce: string, emoji: string) => void;
  onControl: (ctrl: PeerControl) => void;
  onTyping: () => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onChannelOpen: () => void;
  onScreenShareEnded: () => void;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

function buildIceConfig(iceServers?: RTCIceServer[]): RTCConfiguration {
  return {
    iceServers:
      iceServers && iceServers.length > 0 ? iceServers : DEFAULT_ICE_SERVERS,
  };
}

export class PeerSession {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private readonly polite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private closed = false;
  private readonly cb: PeerCallbacks;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(
    initiator: boolean,
    cb: PeerCallbacks,
    iceServers?: RTCIceServer[],
  ) {
    this.cb = cb;
    this.polite = !initiator;
    this.pc = new RTCPeerConnection(buildIceConfig(iceServers));

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.cb.onSignal("ice", JSON.stringify(candidate));
      }
    };

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) {
          this.cb.onSignal("offer", JSON.stringify(this.pc.localDescription));
        }
      } finally {
        this.makingOffer = false;
      }
    };

    this.pc.ontrack = ({ streams }) => {
      this.cb.onRemoteStream(streams[0] ?? null);
    };

    this.pc.onconnectionstatechange = () => {
      this.cb.onConnectionState(this.pc.connectionState);
    };

    if (initiator) {
      this.dc = this.pc.createDataChannel("chat");
      this.wireDataChannel(this.dc);
    } else {
      this.pc.ondatachannel = (e) => {
        this.dc = e.channel;
        this.wireDataChannel(this.dc);
      };
    }
  }

  private wireDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => this.cb.onChannelOpen();
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (
          msg.t === "chat" &&
          typeof msg.text === "string" &&
          typeof msg.nonce === "string"
        ) {
          this.cb.onChat(msg.text, msg.nonce);
        } else if (
          msg.t === "react" &&
          typeof msg.nonce === "string" &&
          typeof msg.emoji === "string"
        ) {
          this.cb.onReaction(msg.nonce, msg.emoji);
        } else if (
          msg.t === "unreact" &&
          typeof msg.nonce === "string" &&
          typeof msg.emoji === "string"
        ) {
          this.cb.onUnreaction(msg.nonce, msg.emoji);
        } else if (msg.t === "ctrl" && typeof msg.ctrl === "string") {
          this.cb.onControl(msg.ctrl as PeerControl);
        } else if (msg.t === "typing") {
          this.cb.onTyping();
        }
      } catch {}
    };
  }

  async handleSignal(type: DescType, payload: string) {
    if (this.closed) return;
    const data = JSON.parse(payload);

    if (type === "ice") {
      if (!this.pc.remoteDescription) {
        this.pendingCandidates.push(data);
        return;
      }
      try {
        await this.pc.addIceCandidate(data);
      } catch {}
      return;
    }

    const desc = data as RTCSessionDescriptionInit;
    const offerCollision =
      desc.type === "offer" &&
      (this.makingOffer || this.pc.signalingState !== "stable");
    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    await this.pc.setRemoteDescription(desc);
    if (desc.type === "offer") {
      await this.pc.setLocalDescription();
      if (this.pc.localDescription) {
        this.cb.onSignal("answer", JSON.stringify(this.pc.localDescription));
      }
    }
    await this.flushPendingCandidates();
  }

  private async flushPendingCandidates() {
    if (this.pendingCandidates.length === 0) return;
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {}
    }
  }

  sendChat(text: string, nonce: string) {
    this.safeSend({ t: "chat", text, nonce });
  }

  sendReaction(nonce: string, emoji: string) {
    this.safeSend({ t: "react", nonce, emoji });
  }

  sendUnreaction(nonce: string, emoji: string) {
    this.safeSend({ t: "unreact", nonce, emoji });
  }

  sendControl(ctrl: PeerControl) {
    this.safeSend({ t: "ctrl", ctrl });
  }

  sendTyping() {
    this.safeSend({ t: "typing" });
  }

  private safeSend(obj: unknown) {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(obj));
    }
  }

  private getVideoSender(): RTCRtpSender | undefined {
    return this.pc
      .getSenders()
      .find((sender) => sender.track?.kind === "video");
  }

  async startVideo(): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }
    }
    return this.localStream;
  }

  async startScreenShare(): Promise<MediaStream> {
    if (this.screenStream) return this.screenStream;

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack) {
      screenStream.getTracks().forEach((t) => t.stop());
      throw new Error("No screen video track");
    }

    screenTrack.onended = () => {
      void this.stopScreenShare();
      this.cb.onScreenShareEnded();
    };

    const sender = this.getVideoSender();
    if (sender) {
      await sender.replaceTrack(screenTrack);
    } else {
      this.pc.addTrack(screenTrack, screenStream);
    }

    this.screenStream = screenStream;
    return screenStream;
  }

  async stopScreenShare(): Promise<void> {
    if (!this.screenStream) return;

    const screenTrack = this.screenStream.getVideoTracks()[0];
    screenTrack?.stop();
    this.screenStream = null;

    const cameraTrack = this.localStream?.getVideoTracks()[0] ?? null;
    const sender = this.getVideoSender();
    if (sender) {
      await sender.replaceTrack(cameraTrack);
    }
  }

  isScreenSharing(): boolean {
    return this.screenStream !== null;
  }

  getLocalStream(): MediaStream | null {
    return this.screenStream ?? this.localStream;
  }

  setAudioMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  setCameraEnabled(enabled: boolean) {
    if (this.screenStream) return;
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  stopVideo() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) track.stop();
      for (const sender of this.pc.getSenders()) {
        if (sender.track) {
          try {
            this.pc.removeTrack(sender);
          } catch {}
        }
      }
      this.localStream = null;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopVideo();
    if (this.dc) {
      try {
        this.dc.close();
      } catch {}
    }
    try {
      this.pc.close();
    } catch {}
  }
}
