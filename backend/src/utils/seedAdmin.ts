import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';
import { PositivityCoins } from '../models/PositivityCoins';
import { logger } from './logger';

export const seedAdmin = async (): Promise<void> => {
  try {
    // Check if any super_admin exists
    const existingAdmin = await User.findOne({ where: { role: 'super_admin' } });
    if (existingAdmin) {
      logger.info('Super admin already exists, skipping seed');
      return;
    }

    const email = process.env.ADMIN_EMAIL || 'admin@seeme.app';
    const password = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    const username = process.env.ADMIN_USERNAME || 'superadmin';

    // Check if this email/username already exists
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      // Promote existing user to super_admin
      existingUser.role = 'super_admin';
      await existingUser.save();
      logger.info('Existing user promoted to super_admin', { email });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const adminId = uuidv4();

    await User.create({
      id: adminId,
      username,
      email,
      passwordHash,
      authProvider: 'email',
      ageVerified: true,
      role: 'super_admin',
      status: 'active',
    });

    // Create coins record for admin
    await PositivityCoins.create({ userId: adminId });

    logger.info('Super admin user seeded successfully', { email, username });
    logger.info('IMPORTANT: Change the default admin password via environment variables ADMIN_EMAIL and ADMIN_PASSWORD');
  } catch (error) {
    logger.error('Failed to seed admin user', { error });
  }
};
