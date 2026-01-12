import { getFirebaseMessaging } from '../config/firebase';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Service for sending push notifications via Firebase Cloud Messaging
 */
export class PushNotificationService {
  /**
   * Send a push notification for a new chat message
   * @param receiverId - ID of the user receiving the message
   * @param senderUsername - Username of the sender
   * @param messageContent - Content of the message
   * @param conversationId - ID of the conversation
   * @param messageType - Type of message (text, image, post_share)
   */
  static async sendMessageNotification(
    receiverId: string,
    senderUsername: string,
    messageContent: string,
    conversationId: string,
    messageType: 'text' | 'image' | 'post_share' | 'system' = 'text'
  ): Promise<void> {
    try {
      const receiver = await User.findByPk(receiverId);

      // Check if receiver exists and has notifications enabled
      if (!receiver || !receiver.fcmToken || !receiver.chatNotificationsEnabled) {
        logger.debug('Push notification not sent', {
          receiverId,
          reason: !receiver ? 'User not found' : !receiver.fcmToken ? 'No FCM token' : 'Notifications disabled'
        });
        return;
      }

      const messaging = getFirebaseMessaging();

      // Prepare notification body based on message type
      let notificationBody: string;
      switch (messageType) {
        case 'image':
          notificationBody = '📷 Sent an image';
          break;
        case 'post_share':
          notificationBody = '📤 Shared a post';
          break;
        case 'system':
          notificationBody = messageContent;
          break;
        default: // text
          notificationBody = messageContent.length > 100
            ? `${messageContent.substring(0, 100)}...`
            : messageContent;
      }

      // Send the notification
      await messaging.send({
        token: receiver.fcmToken,
        notification: {
          title: senderUsername,
          body: notificationBody
        },
        data: {
          type: 'new_message',
          senderId: senderUsername,
          conversationId: conversationId,
          messageType: messageType
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'chat_messages',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true
            }
          }
        }
      });

      logger.info('Push notification sent successfully', {
        receiverId,
        senderUsername,
        conversationId,
        messageType
      });

    } catch (error: any) {
      // Log error but don't throw - notification failures shouldn't break message sending
      logger.error('Failed to send push notification', {
        error: error.message,
        receiverId,
        senderUsername,
        conversationId
      });
    }
  }

  /**
   * Send a notification for multiple unread messages
   * @param receiverId - ID of the user receiving the notification
   * @param unreadCount - Number of unread messages
   */
  static async sendUnreadMessagesNotification(
    receiverId: string,
    unreadCount: number
  ): Promise<void> {
    try {
      const receiver = await User.findByPk(receiverId);

      if (!receiver || !receiver.fcmToken || !receiver.chatNotificationsEnabled) {
        return;
      }

      const messaging = getFirebaseMessaging();

      await messaging.send({
        token: receiver.fcmToken,
        notification: {
          title: 'New Messages',
          body: `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`
        },
        data: {
          type: 'unread_messages',
          unreadCount: unreadCount.toString()
        },
        android: {
          priority: 'normal',
          notification: {
            sound: 'default',
            channelId: 'chat_messages'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: unreadCount
            }
          }
        }
      });

      logger.info('Unread messages notification sent', { receiverId, unreadCount });

    } catch (error: any) {
      logger.error('Failed to send unread messages notification', {
        error: error.message,
        receiverId,
        unreadCount
      });
    }
  }

  /**
   * Register or update a user's FCM token
   * @param userId - ID of the user
   * @param fcmToken - FCM token from the device
   */
  static async registerFCMToken(userId: string, fcmToken: string): Promise<void> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      await user.update({ fcmToken });

      logger.info('FCM token registered', { userId });

    } catch (error: any) {
      logger.error('Failed to register FCM token', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Update notification preferences for a user
   * @param userId - ID of the user
   * @param chatNotificationsEnabled - Whether to enable chat notifications
   */
  static async updateNotificationPreferences(
    userId: string,
    chatNotificationsEnabled: boolean
  ): Promise<void> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      await user.update({ chatNotificationsEnabled });

      logger.info('Notification preferences updated', { userId, chatNotificationsEnabled });

    } catch (error: any) {
      logger.error('Failed to update notification preferences', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

export default PushNotificationService;
