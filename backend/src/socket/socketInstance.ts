import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setSocketInstance(io: Server): void {
  ioInstance = io;
}

export function getSocketInstance(): Server | null {
  return ioInstance;
}
