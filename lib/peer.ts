import { peerConfig } from "@/config/peer";
import EventEmitter from "events";
import _Peer, { DataConnection, PeerError, PeerErrorType } from "peerjs";

interface PeerEvents {
  ready: (peerId: string) => void;
  connection: (conn: DataConnection) => void;
  data: (payload: { peerId: string; data: unknown }) => void;
  disconnection: (peerId: string) => void;
  error: (err: PeerError<`${PeerErrorType}`>) => void;
}

export class Peer<D = unknown> extends EventEmitter<EventMap<PeerEvents>> {
  private peer: _Peer;
  private connections: DataConnection[] = [];
  private isDestroyed = false;

  get id() {
    return this.peer.id;
  }

  constructor(id?: string) {
    super();
    this.peer = id ? new _Peer(id, peerConfig) : new _Peer(peerConfig);
    this.peer.on("open", this.onOpen.bind(this));
    this.peer.on("connection", this.onConnection.bind(this));
    this.peer.on("error", this.onError.bind(this));

    if (typeof window !== "undefined") {
      window.addEventListener(
        "beforeunload",
        this.handleBeforeUnload.bind(this),
      );
    }
  }

  private handleBeforeUnload() {
    this.destroy();
  }

  connect(peerId: string) {
    if (this.isDestroyed) {
      return Promise.reject(new Error("Peer is destroyed."));
    }
    let errorHandler: ((err: PeerError<`${PeerErrorType}`>) => void) | null =
      null;
    return new Promise<void>((resolve, reject) => {
      this.on(
        "error",
        (errorHandler = (err) => {
          if (err.type === "peer-unavailable")
            reject(new Error(`Peer ${peerId} is unavailable.`));
        }),
      );
      const conn = this.peer.connect(peerId, { reliable: true });
      conn.on("open", this.onConnection.bind(this, conn));
      conn.once("open", () => resolve(undefined));
    }).finally(() => {
      if (errorHandler) this.off("error", errorHandler);
    });
  }

  broadcast(data: D) {
    if (this.isDestroyed) {
      return Promise.reject(new Error("Peer is destroyed."));
    }
    return Promise.all(
      this.connections.map((conn) => {
        if (conn.open) return conn.send(data);
      }),
    ).then(() => undefined);
  }

  disconnect(peerId: string) {
    if (this.isDestroyed) {
      return Promise.reject(new Error("Peer is destroyed."));
    }
    const conn = this.connections.find((c) => c.peer === peerId);
    if (conn) {
      conn.close();
      this.connections = this.connections.filter((c) => c !== conn);
      return true;
    }
    return false;
  }

  destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener(
        "beforeunload",
        this.handleBeforeUnload.bind(this),
      );
    }
    this.peer.destroy();
    this.connections = [];
    this.isDestroyed = true;
  }

  private onOpen() {
    console.log(`[Peer] [${this.peer.id}] Peer client is ready.`);
    this.emit("ready", this.peer.id);
  }

  private onConnection(conn: DataConnection) {
    console.log(
      `[Peer] [${this.peer.id}] Received connection from ${conn.peer}.`,
    );
    this.connections.push(conn);
    conn.on("close", this.onDisconnection.bind(this, conn));
    conn.on("data", this.onData.bind(this, conn));
    this.emit("connection", conn);
  }

  private onData(conn: DataConnection, data: unknown) {
    console.log(
      `[Peer] [${this.peer.id}] Received data from ${conn.peer}:`,
      data,
    );
    this.emit("data", { peerId: conn.peer, data });
  }

  private onDisconnection(conn: DataConnection) {
    console.log(
      `[Peer] [${this.peer.id}] Connection with ${conn.peer} closed.`,
    );
    this.connections = this.connections.filter((c) => c !== conn);
    this.emit("disconnection", conn.peer);
  }

  private onError(err: PeerError<`${PeerErrorType}`>) {
    console.warn(`[Peer] [${this.peer.id}] Peer client error: ${err.type}`);
    console.warn(err);
    this.emit("error", err);
  }
}
