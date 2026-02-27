/**
 * Friendship Meetup Socket.io event wrappers.
 * Uses the existing socketService singleton.
 */

import { socketService } from './socket';

export const friendshipSocket = {
  joinSession(sessionId: string) {
    socketService.emit('friendship:join_session', { sessionId });
  },

  leaveSession(sessionId: string) {
    socketService.emit('friendship:leave_session', { sessionId });
  },

  signalReady(sessionId: string) {
    socketService.emit('friendship:ready', { sessionId });
  },

  startCountdown(sessionId: string, poseIndex: number) {
    socketService.emit('friendship:start_countdown', { sessionId, poseIndex });
  },

  triggerCapture(sessionId: string, poseIndex: number) {
    socketService.emit('friendship:trigger_capture', { sessionId, poseIndex });
  },

  poseDone(sessionId: string, poseIndex: number) {
    socketService.emit('friendship:pose_done', { sessionId, poseIndex });
  },

  allDone(sessionId: string) {
    socketService.emit('friendship:all_done', { sessionId });
  },

  cancelSession(sessionId: string) {
    socketService.emit('friendship:cancel', { sessionId });
  },

  // Event listeners
  onPartnerJoined(callback: (data: { userId: string; sessionId: string }) => void) {
    socketService.on('friendship:partner_joined', callback);
    return () => socketService.off('friendship:partner_joined', callback);
  },

  onBothReady(callback: (data: { sessionId: string }) => void) {
    socketService.on('friendship:both_ready', callback);
    return () => socketService.off('friendship:both_ready', callback);
  },

  onCountdown(callback: (data: { sessionId: string; poseIndex: number; countdownSeconds: number }) => void) {
    socketService.on('friendship:countdown', callback);
    return () => socketService.off('friendship:countdown', callback);
  },

  onCaptureNow(callback: (data: { sessionId: string; poseIndex: number }) => void) {
    socketService.on('friendship:capture_now', callback);
    return () => socketService.off('friendship:capture_now', callback);
  },

  onPoseComplete(callback: (data: { sessionId: string; poseIndex: number; nextPoseIndex: number }) => void) {
    socketService.on('friendship:pose_complete', callback);
    return () => socketService.off('friendship:pose_complete', callback);
  },

  onAllPosesComplete(callback: (data: { sessionId: string }) => void) {
    socketService.on('friendship:all_poses_complete', callback);
    return () => socketService.off('friendship:all_poses_complete', callback);
  },

  onSessionCancelled(callback: (data: { sessionId: string; cancelledBy: string }) => void) {
    socketService.on('friendship:session_cancelled', callback);
    return () => socketService.off('friendship:session_cancelled', callback);
  },

  onStripDecorated(callback: (data: { sessionId: string; decoratedStripUrl: string }) => void) {
    socketService.on('friendship:strip_decorated', callback);
    return () => socketService.off('friendship:strip_decorated', callback);
  },

  // Remove all friendship listeners
  removeAllListeners() {
    const events = [
      'friendship:partner_joined',
      'friendship:both_ready',
      'friendship:countdown',
      'friendship:capture_now',
      'friendship:pose_complete',
      'friendship:all_poses_complete',
      'friendship:session_cancelled',
      'friendship:strip_decorated',
    ];
    events.forEach(event => socketService.off(event));
  },
};
