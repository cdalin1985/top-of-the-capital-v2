const express = require('express');
const { body, validationResult, query, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('../generated/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const winston = require('winston');
const securityConfig = require('../config/security');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = (securityConfig && securityConfig.getJWTConfig ? securityConfig.getJWTConfig().secret : (process.env.JWT_SECRET || 'capital_ladder_jwt_dev_secret'));

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

// Auth middleware
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }
  if (!token && req.headers?.cookie) {
    const parts = req.headers.cookie.split(';').map(s => s.trim());
    for (const p of parts) {
      const [k, ...rest] = p.split('=');
      if (k === 'token') {
        token = decodeURIComponent(rest.join('='));
        break;
      }
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }
  try {
    const { secret } = securityConfig.getJWTConfig();
    const p = jwt.verify(token, secret);
    req.userId = p.userId;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// User registration endpoint
router.post('/register', [
  body('email').trim().isEmail().normalizeEmail(),
  body('displayName').trim().isLength({ min: 2, max: 50 }),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, displayName, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        password: hashedPassword,
        isActive: true,
        isAdmin: false
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        createdAt: true
      }
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`New user registered: ${user.email}`);
    
    // Ensure we never leak password field even if Prisma returns it in mocks
    const safeUser = { ...user };
    if (Object.prototype.hasOwnProperty.call(safeUser, 'password')) {
      delete safeUser.password;
    }

    res.status(201).json({
      success: true,
      user: safeUser,
      token
    });
  } catch (error) {
    logger.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and user ID
    const ext = path.extname(file.originalname);
    const filename = `avatar_${req.userId}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get user profile (public)
router.get('/profile/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: {
          where: { isVisible: true },
          include: { achievement: true },
          orderBy: { earnedAt: 'desc' }
        },
        statistics: true,
        _count: {
          select: {
            matchesWon: true,
            challengesCreated: true,
            challengesTargeted: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check privacy settings
    if (user.profileVisibility === 'private' && userId !== requesterId) {
      return res.status(403).json({ message: 'Profile is private' });
    }

    // Log profile view (if different user)
    if (userId !== requesterId) {
      await prisma.profileView.create({
        data: {
          viewerId: requesterId,
          profileId: userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }

    // Prepare response based on privacy settings
    const achievementsSafe = Array.isArray(user.achievements) ? user.achievements : [];
    const counts = user._count || {};

    const profileData = {
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      favoriteGame: user.favoriteGame,
      playingSince: user.playingSince,
      isActive: user.isActive,
      rank: user.rank,
      achievements: achievementsSafe.map(pa => ({
        id: pa.achievement?.id,
        name: pa.achievement?.name,
        description: pa.achievement?.description,
        icon: pa.achievement?.icon,
        category: pa.achievement?.category,
        rarity: pa.achievement?.rarity,
        points: pa.achievement?.points,
        earnedAt: pa.earnedAt
      })),
      matchStats: {
        totalMatches: counts.matchesWon ?? 0, // This needs to be calculated properly
        challengesCreated: counts.challengesCreated ?? 0,
        challengesReceived: counts.challengesTargeted ?? 0
      }
    };

    // Add location if user allows it
    if (user.showLocation) {
      profileData.location = user.location;
      profileData.homeVenue = user.homeVenue;
    }

    // Add last active if user allows it
    if (user.showLastActive) {
      profileData.lastActiveAt = user.lastActiveAt;
    }

    // Add detailed statistics if user allows it and they exist
    if (user.showStats && user.statistics) {
      profileData.statistics = user.statistics;
    }

    res.json(profileData);
  } catch (error) {
    logger.error('Error fetching user profile:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user's own profile (private view)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        achievements: {
          include: { achievement: true },
          orderBy: { earnedAt: 'desc' }
        },
        statistics: true,
        notificationPreferences: true,
        _count: {
          select: {
            matchesWon: true,
            challengesCreated: true,
            challengesTargeted: true,
            profileViews: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        ...user,
        password: undefined, // Never send password hash
        profileViewCount: user._count.profileViews,
        achievements: user.achievements.map(pa => ({
          ...pa,
          achievement: pa.achievement
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching own profile:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.put(
  '/profile',
  authMiddleware,
  [
    body('displayName').optional().isLength({ min: 1, max: 50 }),
    body('bio').optional().isLength({ max: 500 }),
    body('location').optional().isLength({ max: 100 }),
    body('favoriteGame')
      .optional()
      .isIn(['Eight Ball', 'Nine Ball', 'Ten Ball', 'Straight Pool', 'One Pocket']),
    body('playingSince').optional().isISO8601(),
    body('homeVenue').optional().isLength({ max: 100 }),
    body('profileVisibility').optional().isIn(['public', 'friends', 'private']),
    body('showStats').optional().isBoolean(),
    body('showLocation').optional().isBoolean(),
    body('showLastActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: errors
            .array()
            .map(e => e.msg)
            .join(', ')
        });
      }

      const updateData = {};
      const allowedFields = [
        'displayName',
        'bio',
        'location',
        'favoriteGame',
        'playingSince',
        'homeVenue',
        'profileVisibility',
        'showStats',
        'showLocation',
        'showLastActive'
      ];

      // Only include provided fields in update
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (field === 'playingSince' && req.body[field]) {
            updateData[field] = new Date(req.body[field]);
          } else {
            updateData[field] = req.body[field];
          }
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          displayName: true,
          avatar: true,
          bio: true,
          location: true,
          favoriteGame: true,
          playingSince: true,
          homeVenue: true,
          profileVisibility: true,
          showStats: true,
          showLocation: true,
          showLastActive: true,
          updatedAt: true
        }
      });

      logger.info(`User profile updated: ${req.userId}`);
      res.json({
        success: true,
        user: updatedUser
      });
    } catch (error) {
      logger.error('Error updating user profile:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Upload avatar
router.post('/profile/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get current user to check for existing avatar
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { avatar: true }
    });

    // Delete old avatar file if it exists
    if (user?.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', 'public', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user with new avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        displayName: true,
        avatar: true
      }
    });

    logger.info(`Avatar uploaded for user: ${req.userId}`);
    res.json({
      message: 'Avatar uploaded successfully',
      avatar: avatarUrl,
      user: updatedUser
    });
  } catch (error) {
    // Clean up uploaded file if database update fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    logger.error('Error uploading avatar:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete avatar
router.delete('/profile/avatar', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { avatar: true }
    });

    if (user?.avatar) {
      // Delete file
      const avatarPath = path.join(__dirname, '..', 'public', user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }

      // Update database
      await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: null }
      });
    }

    logger.info(`Avatar deleted for user: ${req.userId}`);
    res.json({ message: 'Avatar deleted successfully' });
  } catch (error) {
    logger.error('Error deleting avatar:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user statistics (detailed)
router.get('/profile/statistics', authMiddleware, async (req, res) => {
  try {
    const statistics = await prisma.playerStatistics.findUnique({
      where: { userId: req.userId }
    });

    if (!statistics) {
      // Create empty statistics if they don't exist
      const newStats = await prisma.playerStatistics.create({
        data: { userId: req.userId }
      });
      return res.json(newStats);
    }

    res.json(statistics);
  } catch (error) {
    logger.error('Error fetching user statistics:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user achievements
router.get('/profile/achievements', authMiddleware, async (req, res) => {
  try {
    const achievements = await prisma.playerAchievement.findMany({
      where: { userId: req.userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' }
    });

    res.json(
      achievements.map(pa => ({
        id: pa.id,
        earnedAt: pa.earnedAt,
        isVisible: pa.isVisible,
        progress: pa.progress,
        achievement: pa.achievement
      }))
    );
  } catch (error) {
    logger.error('Error fetching user achievements:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Toggle achievement visibility
router.put(
  '/profile/achievements/:achievementId/visibility',
  authMiddleware,
  [body('isVisible').isBoolean()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: errors
            .array()
            .map(e => e.msg)
            .join(', ')
        });
      }

      const { achievementId } = req.params;
      const { isVisible } = req.body;

      const updated = await prisma.playerAchievement.updateMany({
        where: {
          userId: req.userId,
          achievementId: achievementId
        },
        data: { isVisible }
      });

      if (updated.count === 0) {
        return res.status(404).json({ message: 'Achievement not found' });
      }

      res.json({ message: 'Achievement visibility updated' });
    } catch (error) {
      logger.error('Error updating achievement visibility:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Get profile views (who viewed my profile)
router.get('/profile/views', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const views = await prisma.profileView.findMany({
      where: { profileId: req.userId },
      include: {
        profile: false // We don't need profile details for the viewed user
      },
      orderBy: { viewedAt: 'desc' },
      skip,
      take: limit
    });

    // Get viewer details
    const viewerIds = [...new Set(views.map(v => v.viewerId))];
    const viewers = await prisma.user.findMany({
      where: { id: { in: viewerIds } },
      select: {
        id: true,
        displayName: true,
        avatar: true
      }
    });

    const viewerMap = new Map(viewers.map(v => [v.id, v]));

    const enrichedViews = views.map(view => ({
      id: view.id,
      viewedAt: view.viewedAt,
      viewer: viewerMap.get(view.viewerId)
    }));

    const totalViews = await prisma.profileView.count({
      where: { profileId: req.userId }
    });

    res.json({
      views: enrichedViews,
      pagination: {
        page,
        limit,
        total: totalViews,
        pages: Math.ceil(totalViews / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching profile views:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search users (public profiles)
router.get(
  '/search',
  authMiddleware,
  [
    query('q').optional().isLength({ min: 1, max: 100 }),
    query('location').optional().isLength({ max: 100 }),
    query('favoriteGame')
      .optional()
      .isIn(['Eight Ball', 'Nine Ball', 'Ten Ball', 'Straight Pool', 'One Pocket']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: errors
            .array()
            .map(e => e.msg)
            .join(', ')
        });
      }

      const { q, location, favoriteGame, page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        AND: [
          { profileVisibility: 'public' },
          { isActive: true },
          { id: { not: req.userId } } // Exclude self from search
        ]
      };

      // Add search filters
      if (q) {
        where.AND.push({
          OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } }
          ]
        });
      }

      if (location) {
        where.AND.push({
          AND: [
            { showLocation: true },
            {
              OR: [
                { location: { contains: location, mode: 'insensitive' } },
                { homeVenue: { contains: location, mode: 'insensitive' } }
              ]
            }
          ]
        });
      }

      if (favoriteGame) {
        where.AND.push({ favoriteGame });
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          avatar: true,
          bio: true,
          location: true,
          favoriteGame: true,
          homeVenue: true,
          rank: true,
          showLocation: true,
          lastActiveAt: true,
          showLastActive: true,
          _count: {
            select: { matchesWon: true }
          }
        },
        orderBy: [{ rank: 'asc' }, { displayName: 'asc' }],
        skip,
        take: parseInt(limit)
      });

      // Filter out location data based on privacy settings
      const filteredUsers = users.map(user => {
        const userData = { ...user };
        if (!user.showLocation) {
          delete userData.location;
          delete userData.homeVenue;
        }
        if (!user.showLastActive) {
          delete userData.lastActiveAt;
        }
        delete userData.showLocation;
        delete userData.showLastActive;
        return userData;
      });

      const total = await prisma.user.count({ where });

      res.json({
        users: filteredUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('Error searching users:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

module.exports = router;
