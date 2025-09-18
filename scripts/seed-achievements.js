/**
 * Achievement System Seed Data
 * This script populates the database with predefined achievements
 */

const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const achievements = [
  // Win-based achievements
  {
    name: 'First Victory',
    description: 'Win your first match',
    icon: '🏆',
    category: 'wins',
    rarity: 'common',
    points: 10,
    criteria: JSON.stringify({ wins: 1 })
  },
  {
    name: 'Five Wins',
    description: 'Win 5 matches',
    icon: '🎯',
    category: 'wins',
    rarity: 'common',
    points: 25,
    criteria: JSON.stringify({ wins: 5 })
  },
  {
    name: 'Ten Wins',
    description: 'Win 10 matches',
    icon: '⭐',
    category: 'wins',
    rarity: 'rare',
    points: 50,
    criteria: JSON.stringify({ wins: 10 })
  },
  {
    name: 'Champion',
    description: 'Win 25 matches',
    icon: '👑',
    category: 'wins',
    rarity: 'epic',
    points: 100,
    criteria: JSON.stringify({ wins: 25 })
  },
  {
    name: 'Pool Master',
    description: 'Win 50 matches',
    icon: '🎱',
    category: 'wins',
    rarity: 'legendary',
    points: 250,
    criteria: JSON.stringify({ wins: 50 })
  },

  // Streak-based achievements
  {
    name: 'Hot Streak',
    description: 'Win 3 matches in a row',
    icon: '🔥',
    category: 'streaks',
    rarity: 'common',
    points: 20,
    criteria: JSON.stringify({ winStreak: 3 })
  },
  {
    name: 'Unstoppable',
    description: 'Win 5 matches in a row',
    icon: '⚡',
    category: 'streaks',
    rarity: 'rare',
    points: 50,
    criteria: JSON.stringify({ winStreak: 5 })
  },
  {
    name: 'Legendary Streak',
    description: 'Win 10 matches in a row',
    icon: '🌟',
    category: 'streaks',
    rarity: 'legendary',
    points: 200,
    criteria: JSON.stringify({ winStreak: 10 })
  },

  // Social achievements
  {
    name: 'Challenge Accepted',
    description: 'Accept your first challenge',
    icon: '🤝',
    category: 'social',
    rarity: 'common',
    points: 5,
    criteria: JSON.stringify({ challengesAccepted: 1 })
  },
  {
    name: 'The Challenger',
    description: 'Send 5 challenges to other players',
    icon: '⚔️',
    category: 'social',
    rarity: 'common',
    points: 15,
    criteria: JSON.stringify({ challengesSent: 5 })
  },
  {
    name: 'Social Butterfly',
    description: 'Accept 10 challenges',
    icon: '🦋',
    category: 'social',
    rarity: 'rare',
    points: 40,
    criteria: JSON.stringify({ challengesAccepted: 10 })
  },

  // Milestone achievements
  {
    name: 'Welcome to the Hall',
    description: 'Complete your player profile',
    icon: '🎪',
    category: 'milestones',
    rarity: 'common',
    points: 10,
    criteria: JSON.stringify({ profileComplete: true })
  },
  {
    name: 'Veteran Player',
    description: 'Play for 30 days',
    icon: '🏛️',
    category: 'milestones',
    rarity: 'rare',
    points: 75,
    criteria: JSON.stringify({ daysPlayed: 30 })
  },
  {
    name: 'Eight Ball Expert',
    description: 'Win 15 Eight Ball matches',
    icon: '🎯',
    category: 'discipline',
    rarity: 'rare',
    points: 60,
    criteria: JSON.stringify({ disciplineWins: { 'Eight Ball': 15 } })
  },
  {
    name: 'Nine Ball Specialist',
    description: 'Win 15 Nine Ball matches',
    icon: '9️⃣',
    category: 'discipline',
    rarity: 'rare',
    points: 60,
    criteria: JSON.stringify({ disciplineWins: { 'Nine Ball': 15 } })
  },
  {
    name: 'Ten Ball Master',
    description: 'Win 10 Ten Ball matches',
    icon: '🔟',
    category: 'discipline',
    rarity: 'epic',
    points: 80,
    criteria: JSON.stringify({ disciplineWins: { 'Ten Ball': 10 } })
  },

  // Special achievements
  {
    name: 'Perfect Game',
    description: 'Win a match without losing a single game',
    icon: '💎',
    category: 'special',
    rarity: 'epic',
    points: 100,
    criteria: JSON.stringify({ perfectGame: true })
  },
  {
    name: 'Comeback King',
    description: 'Win a match after being down by 3 games',
    icon: '🔄',
    category: 'special',
    rarity: 'epic',
    points: 120,
    criteria: JSON.stringify({ comebackWin: 3 })
  },
  {
    name: 'Early Bird',
    description: 'Play a match before 8 AM',
    icon: '🌅',
    category: 'special',
    rarity: 'rare',
    points: 30,
    criteria: JSON.stringify({ earlyBird: true })
  },
  {
    name: 'Night Owl',
    description: 'Play a match after 11 PM',
    icon: '🦉',
    category: 'special',
    rarity: 'rare',
    points: 30,
    criteria: JSON.stringify({ nightOwl: true })
  }
];

async function seedAchievements() {
  console.log('Starting achievement seeding...');

  try {
    // Check if achievements already exist
    const existingCount = await prisma.achievement.count();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing achievements. Skipping seed.`);
      return;
    }

    // Create achievements
    console.log(`Creating ${achievements.length} achievements...`);
    // SQLite doesn't support skipDuplicates, so we'll create them individually with try-catch
    let createdCount = 0;
    for (const achievement of achievements) {
      try {
        await prisma.achievement.create({ data: achievement });
        createdCount++;
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`Skipping duplicate achievement: ${achievement.name}`);
        } else {
          throw error;
        }
      }
    }

    const result = { count: createdCount };

    console.log(`✅ Successfully created ${result.count} achievements!`);

    // Display summary by category
    const categories = {};
    achievements.forEach(ach => {
      if (!categories[ach.category]) {
        categories[ach.category] = 0;
      }
      categories[ach.category]++;
    });

    console.log('\nAchievements by category:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });

    console.log('\nAchievements by rarity:');
    const rarities = {};
    achievements.forEach(ach => {
      if (!rarities[ach.rarity]) {
        rarities[ach.rarity] = 0;
      }
      rarities[ach.rarity]++;
    });

    Object.entries(rarities).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count}`);
    });
  } catch (error) {
    console.error('Error seeding achievements:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedAchievements()
    .then(() => {
      console.log('\n🎉 Achievement seeding completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Achievement seeding failed:', error.message);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

module.exports = { seedAchievements };
