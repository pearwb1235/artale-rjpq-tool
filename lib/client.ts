import { Peer } from "@/lib/peer";
import { ServerSchema } from "@/lib/server";
import EventEmitter from "events";
import z from "zod";

const schema = z.array(z.array(z.number().min(0).max(4)).length(4)).length(10);

interface ClientEvents {
  gridUpdate: () => void;
  disconnection: () => void;
}

export type ClientSchema = z.infer<typeof schema>;

export class Client extends EventEmitter<EventMap<ClientEvents>> {
  private peer: Peer<ServerSchema>;
  private _roomId: string | null = null;
  private _password: string | null = null;
  private grid: number[][] = Array.from({ length: 10 }, () => [0, 0, 0, 0]);
  private cacheGrid: number[][];

  get isConnected() {
    return this._roomId !== null;
  }

  get roomId() {
    return this._roomId;
  }

  get password() {
    return this._password;
  }

  constructor() {
    super();
    this.peer = new Peer();
    this.cacheGrid = this.grid.map((layer) => [...layer]);
  }

  private onData({ peerId, data }: { peerId: string; data: unknown }) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      console.warn(`[Client] Received invalid data from ${peerId}:`, data);
      return;
    }
    this.grid = parsed.data;
    this.onGridUpdate();
  }

  private onDisconnection() {
    console.log("Disconnected from server");
    this.resetState();
    this.emit("disconnection");
  }

  destroy() {
    this.peer.destroy();
  }

  subscribe(listener: () => void) {
    this.on("gridUpdate", listener);
    return () => {
      this.off("gridUpdate", listener);
    };
  }

  private resetState() {
    this._roomId = null;
    this._password = null;
    this.grid = Array.from({ length: 10 }, () => [0, 0, 0, 0]);
    this.onGridUpdate();
  }

  async joinRoom(roomId: string, password: string) {
    if (this._roomId) {
      throw new Error(
        "Already in a room. Please leave the current room first.",
      );
    }
    await this.peer.connect(`pearki-rjpq-${roomId}-${password}`);
    this._roomId = roomId;
    this._password = password;
    this.peer.on("data", this.onData.bind(this));
    this.peer.on("disconnection", this.onDisconnection.bind(this));
  }

  async leaveRoom() {
    if (!this._roomId) {
      throw new Error("Not currently in a room.");
    }
    await this.peer.disconnect(`pearki-rjpq-${this._roomId}-${this._password}`);
    this.resetState();
  }

  private onGridUpdate() {
    this.cacheGrid = this.grid.map((layer) => [...layer]);
    this.emit("gridUpdate");
  }

  getGrid() {
    return this.cacheGrid;
  }

  markSlot(layer: number, slot: number, color: number) {
    if (!this._roomId) {
      throw new Error("Not currently in a room.");
    }
    this.peer.broadcast({
      type: "mark",
      layer,
      slot,
      color,
    });
  }

  resetGrid() {
    if (!this._roomId) {
      throw new Error("Not currently in a room.");
    }
    this.peer.broadcast({
      type: "reset",
    });
  }
}
