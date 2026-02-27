import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

/**
 * Handle friendship meetup real-time events
 */
export const handleFriendshipEvents = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  // Host/guest joins a friendship session room
  socket.on('friendship:join_session', (data: { sessionId: string }) => {
    const room = `friendship:${data.sessionId}`;
    socket.join(room);
    logger.info('User joined friendship session room', { userId, sessionId: data.sessionId });

    // Notify others in the room that a partner joined
    socket.to(room).emit('friendship:partner_joined', {
      userId,
      sessionId: data.sessionId
    });
  });

  // Both users are ready to start capturing
  socket.on('friendship:ready', (data: { sessionId: string }) => {
    const room = `friendship:${data.sessionId}`;
    io.to(room).emit('friendship:both_ready', {
      sessionId: data.sessionId
    });
  });

  // Countdown initiated (host triggers)
  socket.on('friendship:start_countdown', (data: { sessionId: string; poseIndex: number }) => {
    const room = `friendship:${data.sessionId}`;
    io.to(room).emit('friendship:countdown', {
      sessionId: data.sessionId,
      poseIndex: data.poseIndex,
      countdownSeconds: 2
    });
  });

  // Capture now — synced moment for both devices
  socket.on('friendship:trigger_capture', (data: { sessionId: string; poseIndex: number }) => {
    const room = `friendship:${data.sessionId}`;
    io.to(room).emit('friendship:capture_now', {
      sessionId: data.sessionId,
      poseIndex: data.poseIndex
    });
  });

  // Pose completed, move to next
  socket.on('friendship:pose_done', (data: { sessionId: string; poseIndex: number }) => {
    const room = `friendship:${data.sessionId}`;
    io.to(room).emit('friendship:pose_complete', {
      sessionId: data.sessionId,
      poseIndex: data.poseIndex,
      nextPoseIndex: data.poseIndex + 1
    });
  });

  // All poses completed
  socket.on('friendship:all_done', (data: { sessionId: string }) => {
    const room = `friendship:${data.sessionId}`;
    io.to(room).emit('friendship:all_poses_complete', {
      sessionId: data.sessionId
    });
  });

  // Session cancelled
  socket.on('friendship:cancel', (data: { sessionId: string }) => {
    const room = `friendship:${data.sessionId}`;
    socket.to(room).emit('friendship:session_cancelled', {
      sessionId: data.sessionId,
      cancelledBy: userId
    });
    // Leave the room
    socket.leave(room);
  });

  // Leave session room on disconnect
  socket.on('friendship:leave_session', (data: { sessionId: string }) => {
    const room = `friendship:${data.sessionId}`;
    socket.leave(room);
  });
};
