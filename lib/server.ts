import { ClientSchema } from "@/lib/client";
import { Peer } from "@/lib/peer";
import EventEmitter from "events";
import { PeerError, PeerErrorType } from "peerjs";
import z from "zod";

const schema = z.union([
  z.object({
    type: z.literal("mark"),
    layer: z.number().min(0).max(9),
    slot: z.number().min(0).max(3),
    color: z.number().min(0).max(4),
  }),
  z.object({
    type: z.literal("reset"),
  }),
]);

interface ServerEvents {
  ready: () => void;
  shutdown: () => void;
}

export type ServerSchema = z.infer<typeof schema>;

export class Server extends EventEmitter<EventMap<ServerEvents>> {
  readonly roomId: string;
  readonly password: string;
  private peer: Peer<ClientSchema>;
  private grid: number[][] = Array.from({ length: 10 }, () => [0, 0, 0, 0]);

  constructor(password: string) {
    super();
    const roomId = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    this.roomId = roomId;
    this.password = password;
    this.peer = new Peer(`pearki-rjpq-${roomId}-${password}`);
    this.peer.on("ready", this.onReady.bind(this));
    this.peer.on("error", this.onError.bind(this));
    this.peer.on("data", this.onData.bind(this));
  }

  private onReady() {
    this.emit("ready");
  }

  private onError(err: PeerError<`${PeerErrorType}`>) {
    this.shutdown();
  }

  shutdown() {
    this.peer.destroy();
    this.emit("shutdown");
  }

  private syncGrid() {
    this.peer.broadcast(this.grid);
  }

  private onData({ peerId, data }: { peerId: string; data: unknown }) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      console.warn(`[Server] Received invalid data from ${peerId}:`, data);
      return;
    }
    switch (parsed.data.type) {
      case "mark": {
        const { layer, slot, color } = parsed.data;
        for (const index in this.grid[layer]) {
          if (this.grid[layer][index] === color) {
            this.grid[layer][index] = 0;
          }
        }
        this.grid[layer][slot] = color;
        this.syncGrid();
        break;
      }
      case "reset": {
        this.grid = Array.from({ length: 10 }, () => [0, 0, 0, 0]);
        this.syncGrid();
        break;
      }
    }
  }
}
