import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { FriendshipSession } from '../models/FriendshipSession';
import { FriendshipMeetup } from '../models/FriendshipMeetup';
import { FriendshipPhoto } from '../models/FriendshipPhoto';
import { PositivityCoins } from '../models/PositivityCoins';
import { CoinTransaction } from '../models/CoinTransaction';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { formatAvatarForResponse } from '../utils/formatAvatar';
import { TrustScoreService } from './TrustScoreService';
import { logger } from '../utils/logger';

const COINS_PER_MEETUP = 20;
const MAX_PROXIMITY_METERS = 200;
const SESSION_EXPIRY_MINUTES = 15;
const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Excludes O/0, I/1, L

// 12 available poses
const ALL_POSES = [
  'high_five', 'back_to_back', 'heart_hands', 'peace_signs',
  'silly_faces', 'side_hug', 'flexing', 'pointing_at_each_other',
  'thumbs_up', 'victory', 'handshake', 'shoulder_to_shoulder'
];

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

function pickRandomPoses(count: number = 4): string[] {
  const shuffled = [...ALL_POSES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCanonicalPair(userId1: string, userId2: string): { userAId: string; userBId: string } {
  return userId1 < userId2
    ? { userAId: userId1, userBId: userId2 }
    : { userAId: userId2, userBId: userId1 };
}

export class FriendshipMeetupService {

  static async createSession(hostUserId: string, lat?: number, lng?: number): Promise<FriendshipSession> {
    // Expire any old pending sessions for this host
    await FriendshipSession.update(
      { status: 'expired' },
      {
        where: {
          hostUserId,
          status: 'pending',
          expiresAt: { [Op.lt]: new Date() }
        }
      }
    );

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await FriendshipSession.findOne({ where: { inviteCode, status: 'pending' } });
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    const poses = pickRandomPoses(4);

    const session = await FriendshipSession.create({
      hostUserId,
      inviteCode,
      status: 'pending',
      hostLat: lat || null,
      hostLng: lng || null,
      assignedPoses: JSON.stringify(poses),
      expiresAt: new Date(Date.now() + SESSION_EXPIRY_MINUTES * 60 * 1000)
    });

    logger.info('Friendship session created', { sessionId: session.id, hostUserId, inviteCode });
    return session;
  }

  static async joinSession(
    guestUserId: string,
    inviteCode: string,
    lat?: number,
    lng?: number
  ): Promise<FriendshipSession> {
    const session = await FriendshipSession.findOne({
      where: { inviteCode: inviteCode.toUpperCase(), status: 'pending' }
    });

    if (!session) {
      throw new Error('Invalid or expired invite code');
    }

    if (new Date() > session.expiresAt) {
      await session.update({ status: 'expired' });
      throw new Error('Session has expired');
    }

    if (session.hostUserId === guestUserId) {
      throw new Error('Cannot join your own session');
    }

    // Proximity check
    if (session.hostLat != null && session.hostLng != null && lat != null && lng != null) {
      const distance = haversineDistance(session.hostLat, session.hostLng, lat, lng);
      if (distance > MAX_PROXIMITY_METERS) {
        throw new Error(`Too far apart. You need to be within ${MAX_PROXIMITY_METERS}m (current: ${Math.round(distance)}m)`);
      }
    }

    // Check daily limit
    const canMeet = await this.canMeetToday(session.hostUserId, guestUserId);
    if (!canMeet) {
      throw new Error('You have already met this friend today. Try again tomorrow!');
    }

    await session.update({
      guestUserId,
      guestLat: lat || null,
      guestLng: lng || null,
      status: 'active'
    });

    logger.info('Guest joined friendship session', { sessionId: session.id, guestUserId });
    return session;
  }

  static async getSession(sessionId: string): Promise<FriendshipSession | null> {
    return FriendshipSession.findByPk(sessionId, {
      include: [
        { model: User, as: 'host', attributes: ['id', 'username', 'avatarUrl'] },
        { model: User, as: 'guest', attributes: ['id', 'username', 'avatarUrl'] },
        { model: FriendshipMeetup, as: 'meetup', attributes: ['id', 'decoratedStripUrl', 'completedAt', 'coinsAwarded'] }
      ]
    });
  }

  static async submitPhoto(
    sessionId: string,
    poseIndex: number,
    poseName: string,
    photoUrl: string,
    validated: boolean = false,
    validationScore: number = 0
  ): Promise<FriendshipPhoto | null> {
    const session = await FriendshipSession.findByPk(sessionId);
    if (!session || !['active', 'capturing'].includes(session.status)) {
      throw new Error('Session not active');
    }

    // Create or update meetup
    let meetup = await FriendshipMeetup.findOne({ where: { sessionId } });
    if (!meetup) {
      if (!session.guestUserId) {
        throw new Error('No guest in session');
      }
      const { userAId, userBId } = getCanonicalPair(session.hostUserId, session.guestUserId);
      meetup = await FriendshipMeetup.create({
        sessionId,
        userAId,
        userBId,
        lat: session.hostLat,
        lng: session.hostLng
      });
    }

    // Update session to capturing
    if (session.status === 'active') {
      await session.update({ status: 'capturing' });
    }

    const photo = await FriendshipPhoto.create({
      meetupId: meetup.id,
      poseIndex,
      poseName,
      photoUrl,
      poseValidated: validated,
      validationScore
    });

    // Advance pose index
    await session.update({ currentPoseIndex: poseIndex + 1 });

    return photo;
  }

  static async completeMeetup(sessionId: string): Promise<{
    meetup: FriendshipMeetup;
    coinsAwarded: number;
  }> {
    const session = await FriendshipSession.findByPk(sessionId);
    if (!session || !session.guestUserId) {
      throw new Error('Session not found or incomplete');
    }

    const transaction = await sequelize.transaction();

    try {
      // Mark session completed
      await session.update({ status: 'completed' }, { transaction });

      // Get or create meetup
      let meetup = await FriendshipMeetup.findOne({ where: { sessionId }, transaction });
      if (!meetup) {
        const { userAId, userBId } = getCanonicalPair(session.hostUserId, session.guestUserId);
        meetup = await FriendshipMeetup.create({
          sessionId,
          userAId,
          userBId,
          coinsAwarded: COINS_PER_MEETUP,
          completedAt: new Date()
        }, { transaction });
      } else {
        await meetup.update({
          coinsAwarded: COINS_PER_MEETUP,
          completedAt: new Date()
        }, { transaction });
      }

      // Award coins to both users
      await this._awardCoins(session.hostUserId, meetup.id, transaction);
      await this._awardCoins(session.guestUserId, meetup.id, transaction);

      // Auto-follow each other
      await this._ensureMutualFollow(session.hostUserId, session.guestUserId, transaction);

      await transaction.commit();

      // Record bidirectional coin exchange for trust score (fire-and-forget, outside transaction)
      TrustScoreService.recordCoinExchange({
        fromUserId: session.hostUserId,
        toUserId: session.guestUserId,
        amount: COINS_PER_MEETUP,
      }).catch(err => logger.error('Trust score update failed for meetup (host→guest)', { err, sessionId }));

      TrustScoreService.recordCoinExchange({
        fromUserId: session.guestUserId,
        toUserId: session.hostUserId,
        amount: COINS_PER_MEETUP,
      }).catch(err => logger.error('Trust score update failed for meetup (guest→host)', { err, sessionId }));

      logger.info('Friendship meetup completed', {
        sessionId, meetupId: meetup.id,
        hostUserId: session.hostUserId,
        guestUserId: session.guestUserId
      });

      return { meetup, coinsAwarded: COINS_PER_MEETUP };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error completing meetup', { error, sessionId });
      throw error;
    }
  }

  private static async _awardCoins(userId: string, _meetupId: string, transaction: any): Promise<void> {
    let coins = await PositivityCoins.findByPk(userId, { transaction });
    if (!coins) {
      // Import and initialize would be circular, so create inline
      coins = await PositivityCoins.create({
        userId,
        totalCoins: COINS_PER_MEETUP,
        lifetimeEarned: COINS_PER_MEETUP,
        coinsFromMeetups: COINS_PER_MEETUP
      }, { transaction });
    } else {
      await coins.update({
        totalCoins: coins.totalCoins + COINS_PER_MEETUP,
        lifetimeEarned: coins.lifetimeEarned + COINS_PER_MEETUP,
        coinsFromMeetups: (coins.coinsFromMeetups || 0) + COINS_PER_MEETUP
      }, { transaction });
    }

    await CoinTransaction.create({
      fromUserId: null,
      toUserId: userId,
      amount: COINS_PER_MEETUP,
      transactionType: 'earned_friendship',
      message: `Friendship meetup completed`
    }, { transaction });
  }

  private static async _ensureMutualFollow(userId1: string, userId2: string, transaction: any): Promise<void> {
    // Check and create follow in both directions
    const follow1 = await Follow.findOne({
      where: { followerId: userId1, followingId: userId2 },
      transaction
    });
    if (!follow1) {
      await Follow.create({ followerId: userId1, followingId: userId2 }, { transaction });
    }

    const follow2 = await Follow.findOne({
      where: { followerId: userId2, followingId: userId1 },
      transaction
    });
    if (!follow2) {
      await Follow.create({ followerId: userId2, followingId: userId1 }, { transaction });
    }
  }

  static async cancelSession(sessionId: string, userId: string): Promise<void> {
    const session = await FriendshipSession.findByPk(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.hostUserId !== userId && session.guestUserId !== userId) {
      throw new Error('Not authorized');
    }
    await session.update({ status: 'cancelled' });
  }

  static async canMeetToday(userId1: string, userId2: string): Promise<boolean> {
    const { userAId, userBId } = getCanonicalPair(userId1, userId2);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const meetupToday = await FriendshipMeetup.findOne({
      where: {
        userAId,
        userBId,
        completedAt: { [Op.gte]: today }
      }
    });

    return !meetupToday;
  }

  static async getSessionPhotos(sessionId: string): Promise<FriendshipPhoto[]> {
    const meetup = await FriendshipMeetup.findOne({ where: { sessionId } });
    if (!meetup) return [];
    return FriendshipPhoto.findAll({
      where: { meetupId: meetup.id },
      order: [['poseIndex', 'ASC']]
    });
  }

  static async getHistory(userId: string, page: number = 1, limit: number = 20): Promise<{
    meetups: FriendshipMeetup[];
    total: number;
  }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await FriendshipMeetup.findAndCountAll({
      where: {
        [Op.or]: [
          { userAId: userId },
          { userBId: userId }
        ]
      },
      include: [
        { model: User, as: 'userA', attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId'] },
        { model: User, as: 'userB', attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId'] },
        { model: FriendshipPhoto, as: 'photos' }
      ],
      order: [['completedAt', 'DESC']],
      limit,
      offset
    });

    // Add active avatar data to meetup users
    const userIds = new Set<string>();
    rows.forEach(m => {
      const mj = m.toJSON() as any;
      if (mj.userA?.id) userIds.add(mj.userA.id);
      if (mj.userB?.id) userIds.add(mj.userB.id);
    });

    const avatarConfigs = await AvatarConfigSQL.findAll({
      where: { userId: { [Op.in]: [...userIds] }, isActive: true },
    });
    const avatarMap = new Map(avatarConfigs.map(a => [a.userId, formatAvatarForResponse(a)]));

    // Fallback for users with activeAvatarId but inactive config
    const allUsers = rows.flatMap(m => {
      const mj = m.toJSON() as any;
      return [mj.userA, mj.userB].filter(Boolean);
    });
    const missing = allUsers.filter(u => u.activeAvatarId && !avatarMap.has(u.id));
    if (missing.length > 0) {
      const fallbackConfigs = await AvatarConfigSQL.findAll({
        where: { id: { [Op.in]: missing.map(u => u.activeAvatarId) } },
      });
      for (const fc of fallbackConfigs) {
        if (!avatarMap.has(fc.userId)) {
          avatarMap.set(fc.userId, formatAvatarForResponse(fc));
        }
      }
    }

    const meetups = rows.map(m => {
      const mj = m.toJSON() as any;
      if (mj.userA) mj.userA.activeAvatar = avatarMap.get(mj.userA.id) || null;
      if (mj.userB) mj.userB.activeAvatar = avatarMap.get(mj.userB.id) || null;
      return mj;
    });

    return { meetups, total: count };
  }
}

export default FriendshipMeetupService;
