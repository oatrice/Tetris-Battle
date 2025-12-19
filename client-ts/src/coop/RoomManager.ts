/**
 * RoomManager.ts
 * Handles creation, joining, and listening to Coop rooms using Firebase Realtime Database.
 */

import { RealtimeService } from "../services/RealtimeService";

export interface RoomInfo {
    id: string;
    hostId: string;
    players: string[]; // user IDs
    createdAt: number;
}

export class RoomManager {
    private realtime = new RealtimeService();
    private readonly roomsPath = "tetrisCoop/rooms";

    /** Create a new room and return its info */
    async createRoom(hostId: string): Promise<RoomInfo> {
        const roomId = await this.realtime.push(this.roomsPath, {
            hostId,
            players: [hostId],
            createdAt: Date.now(),
        });
        return { id: roomId!, hostId, players: [hostId], createdAt: Date.now() };
    }

    /** Join an existing room */
    async joinRoom(roomId: string, playerId: string): Promise<RoomInfo | null> {
        const room = await this.getRoom(roomId);
        if (!room) return null;
        if (!room.players.includes(playerId)) {
            await this.realtime.update(`${this.roomsPath}/${roomId}`, {
                players: [...room.players, playerId],
            });
        }
        return { ...room, players: [...room.players, playerId] };
    }

    /** Get room data once */
    async getRoom(roomId: string): Promise<RoomInfo | null> {
        console.log('[RoomManager] Getting room:', roomId);
        try {
            const data = await this.realtime.get<RoomInfo>(`${this.roomsPath}/${roomId}`);
            console.log('[RoomManager] Room data:', data);

            if (!data) {
                console.warn('[RoomManager] Room not found:', roomId);
                return null;
            }

            return {
                id: roomId,
                hostId: data.hostId,
                players: data.players || [],
                createdAt: data.createdAt || Date.now()
            };
        } catch (error) {
            console.error('[RoomManager] Error getting room:', error);
            return null;
        }
    }

    /** Listen for room updates (players join/leave) */
    onRoomUpdate(roomId: string, cb: (room: RoomInfo | null) => void): () => void {
        return this.realtime.onValue<RoomInfo>(`${this.roomsPath}/${roomId}`, cb);
    }

    /** Delete a room */
    async deleteRoom(roomId: string): Promise<void> {
        await this.realtime.remove(`${this.roomsPath}/${roomId}`);
    }
}
