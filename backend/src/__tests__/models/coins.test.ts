/**
 * Positivity Coins Model Tests (COINS-001)
 * Tests for TESTCASE.md Phase 2.5 - Positivity Coins
 */

import { PositivityCoins } from '../../models/PositivityCoins';
import { CoinTransaction } from '../../models/CoinTransaction';
import { setupTestDatabase, clearTestDatabase, cleanupTestDatabase } from '../../config/database.test';
import { createTestUser } from '../helpers/testHelpers';

describe('COINS-001: Positivity Coins Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    const user = await createTestUser();
    testUserId = user.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('COINS-001-01: Initialize user coins', () => {
    it('should create coins record with welcome bonus', async () => {
      const coins = await PositivityCoins.create({
        userId: testUserId,
        totalCoins: 3,
        lifetimeEarned: 3,
        lifetimeGiven: 0,
        cooldownCoinsAvailable: 0,
      });

      expect(coins.userId).toBe(testUserId);
      expect(coins.totalCoins).toBe(3);
      expect(coins.lifetimeEarned).toBe(3);
      expect(coins.lifetimeGiven).toBe(0);
      expect(coins.cooldownCoinsAvailable).toBe(0);
    });
  });

  describe('COINS-001-02: Get user coins balance', () => {
    it('should retrieve coins balance', async () => {
      await PositivityCoins.create({
        userId: testUserId,
        totalCoins: 10,
        lifetimeEarned: 15,
        lifetimeGiven: 5,
        cooldownCoinsAvailable: 1,
      });

      const coins = await PositivityCoins.findByPk(testUserId);

      expect(coins).not.toBeNull();
      expect(coins!.totalCoins).toBe(10);
      expect(coins!.lifetimeEarned).toBe(15);
      expect(coins!.lifetimeGiven).toBe(5);
      expect(coins!.cooldownCoinsAvailable).toBe(1);
    });
  });

  describe('COINS-001-03 to COINS-001-04: Cooldown coins', () => {
    it('should track cooldown coins available', async () => {
      const coins = await PositivityCoins.create({
        userId: testUserId,
        totalCoins: 5,
        lifetimeEarned: 5,
        cooldownCoinsAvailable: 3,
      });

      expect(coins.cooldownCoinsAvailable).toBe(3);
    });

    it('should not exceed max 3 cooldown coins', async () => {
      const coins = await PositivityCoins.create({
        userId: testUserId,
        totalCoins: 5,
        lifetimeEarned: 5,
        cooldownCoinsAvailable: 3,
      });

      // Attempt to add more (should be capped at 3)
      coins.cooldownCoinsAvailable = 5;
      await coins.save();

      // Validation should cap at 3
      expect(coins.cooldownCoinsAvailable).toBeLessThanOrEqual(3);
    });
  });

  describe('COINS-001-05: Claim cooldown coins', () => {
    it('should add cooldown coins to total balance', async () => {
      const coins = await PositivityCoins.create({
        userId: testUserId,
        totalCoins: 5,
        lifetimeEarned: 5,
        cooldownCoinsAvailable: 2,
      });

      const claimedAmount = coins.cooldownCoinsAvailable;
      coins.totalCoins += claimedAmount;
      coins.lifetimeEarned += claimedAmount;
      coins.cooldownCoinsAvailable = 0;
      await coins.save();

      expect(coins.totalCoins).toBe(7);
      expect(coins.lifetimeEarned).toBe(7);
      expect(coins.cooldownCoinsAvailable).toBe(0);
    });
  });

  describe('COINS-001-13: Give coins to user', () => {
    it('should transfer coins between users', async () => {
      const user2 = await createTestUser();

      const giverCoins = await PositivityCoins.create({
        userId: testUserId,
        totalCoins: 10,
        lifetimeEarned: 10,
        lifetimeGiven: 0,
      });

      const receiverCoins = await PositivityCoins.create({
        userId: user2.id,
        totalCoins: 5,
        lifetimeEarned: 5,
        lifetimeGiven: 0,
      });

      const giveAmount = 3;

      // Give coins
      giverCoins.totalCoins -= giveAmount;
      giverCoins.lifetimeGiven += giveAmount;
      await giverCoins.save();

      receiverCoins.totalCoins += giveAmount;
      receiverCoins.lifetimeEarned += giveAmount;
      await receiverCoins.save();

      expect(giverCoins.totalCoins).toBe(7);
      expect(giverCoins.lifetimeGiven).toBe(3);
      expect(receiverCoins.totalCoins).toBe(8);
      expect(receiverCoins.lifetimeEarned).toBe(8);
    });
  });

  describe('COINS-001-18: Transaction history', () => {
    it('should record coin transactions', async () => {
      const transaction = await CoinTransaction.create({
        fromUserId: testUserId,
        toUserId: testUserId,
        amount: 5,
        transactionType: 'welcome_bonus',
        message: 'Welcome bonus',
      });

      expect(transaction.id).toBeDefined();
      expect(transaction.toUserId).toBe(testUserId);
      expect(transaction.amount).toBe(5);
      expect(transaction.createdAt).toBeDefined();
    });

    it('should retrieve transaction history', async () => {
      await CoinTransaction.create({
        fromUserId: testUserId,
        toUserId: testUserId,
        amount: 3,
        transactionType: 'welcome_bonus',
        message: 'Welcome',
      });

      await CoinTransaction.create({
        fromUserId: testUserId,
        toUserId: testUserId,
        amount: 2,
        transactionType: 'post_reward',
        message: 'Post created',
      });

      const transactions = await CoinTransaction.findAll({
        where: { toUserId: testUserId },
        order: [['createdAt', 'DESC']],
      });

      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe(2);
      expect(transactions[1].amount).toBe(3);
    });
  });

  describe('Cooldown timer management', () => {
    it('should track next cooldown time', async () => {
      const nextCooldown = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

      const coins = await PositivityCoins.create({
        userId: testUserId,
        totalCoins: 5,
        lifetimeEarned: 5,
        cooldownCoinsAvailable: 0,
        nextCooldownAvailableAt: nextCooldown,
      });

      expect(coins.nextCooldownAvailableAt).toBeDefined();
      expect(coins.nextCooldownAvailableAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
