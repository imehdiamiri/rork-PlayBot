import { rtdb as database } from '../lib/firebase';
import { ref, set, get, onValue, update, remove, onDisconnect } from 'firebase/database';
import { Player } from '../models/Player';

/**
 * MultiplayerService — RTDB-backed room lifecycle.
 *
 * Player records use the canonical {@link Player} shape so room players,
 * single-device players, friend players, and lobby players are all the
 * same type across the app.
 */

export type MultiplayerPlayer = Player;

export interface MultiplayerRoom {
  roomCode: string;
  gameId: string;
  hostId: string;
  players: Record<string, Player>;
  status: 'waiting' | 'playing' | 'closed';
  createdAt: number;
}

class MultiplayerService {
  private generateRoomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createRoom(gameId: string, hostName: string, hostId: string): Promise<string> {
    const roomCode = this.generateRoomCode();
    const roomRef = ref(database, `rooms/${roomCode}`);

    const initialPlayer: Player = {
      id: hostId,
      displayName: hostName,
      isHost: true,
      isLocal: true,
      isReady: true,
    };

    await set(roomRef, {
      roomCode,
      gameId,
      hostId,
      status: 'waiting',
      createdAt: Date.now(),
      players: { [hostId]: initialPlayer },
    });

    await onDisconnect(roomRef).remove();

    return roomCode;
  }

  async joinRoom(roomCode: string, playerName: string, playerId: string): Promise<boolean> {
    const roomRef = ref(database, `rooms/${roomCode}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const roomData = snapshot.val() as MultiplayerRoom;
    if (roomData.status !== 'waiting') {
      throw new Error('Game already started');
    }

    const newPlayer: Player = {
      id: playerId,
      displayName: playerName,
      isHost: false,
      isLocal: true,
      isReady: false,
    };

    await update(ref(database, `rooms/${roomCode}/players`), { [playerId]: newPlayer });

    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await onDisconnect(playerRef).remove();

    return true;
  }

  listenToRoom(roomCode: string, callback: (room: MultiplayerRoom | null) => void): () => void {
    const roomRef = ref(database, `rooms/${roomCode}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      callback(snapshot.exists() ? (snapshot.val() as MultiplayerRoom) : null);
    });
    return unsubscribe;
  }

  async leaveRoom(roomCode: string, playerId: string): Promise<void> {
    const playerRef = ref(database, `rooms/${roomCode}/players/${playerId}`);
    await onDisconnect(playerRef).cancel();
    await remove(playerRef);
  }

  async startGame(roomCode: string): Promise<void> {
    const roomRef = ref(database, `rooms/${roomCode}`);
    await update(roomRef, { status: 'playing' });
  }

  async closeRoom(roomCode: string): Promise<void> {
    const roomRef = ref(database, `rooms/${roomCode}`);
    await onDisconnect(roomRef).cancel();
    await remove(roomRef);
  }
}

export const multiplayerService = new MultiplayerService();
