#!/usr/bin/env node

/**
 * Capital Ladder App - Demo Setup Script
 *
 * This script sets up the application with demo data for presentation purposes.
 * It creates sample users with different skill levels and some initial challenges/matches.
 */

const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_USERS = [
  { email: 'alice@demo.com', displayName: 'Alice Champion', password: 'demo1234', rank: 1 },
  { email: 'bob@demo.com', displayName: 'Bob Striker', password: 'demo1234', rank: 2 },
  { email: 'charlie@demo.com', displayName: 'Charlie Rookie', password: 'demo1234', rank: 3 },
  { email: 'diana@demo.com', displayName: 'Diana Pro', password: 'demo1234', rank: 4 },
  { email: 'eve@demo.com', displayName: 'Eve Sharp', password: 'demo1234', rank: 5 },
  { email: 'frank@demo.com', displayName: 'Frank Hustler', password: 'demo1234', rank: 6 },
  { email: 'grace@demo.com', displayName: 'Grace Steady', password: 'demo1234', rank: 7 },
  { email: 'henry@demo.com', displayName: 'Henry Newcomer', password: 'demo1234', rank: 8 }
];

async function setupDemoData() {
  console.log('🎱 Setting up Capital Ladder Demo Data...\n');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.match.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.user.deleteMany();

    // Create demo users
    console.log('👥 Creating demo users...');
    const createdUsers = [];

    for (const userData of DEMO_USERS) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          displayName: userData.displayName,
          password: hashedPassword,
          rank: userData.rank
        }
      });
      createdUsers.push(user);
      console.log(`   ✓ Created: ${userData.displayName} (Rank #${userData.rank})`);
    }

    // Create some sample challenges
    console.log('\n🏆 Creating sample challenges...');

    // Charlie challenges Bob (lower rank challenging higher rank)
    await prisma.challenge.create({
      data: {
        creatorId: createdUsers[2].id, // Charlie
        targetUserId: createdUsers[1].id, // Bob
        discipline: 'Eight Ball',
        gamesToWin: 5,
        status: 'pending'
      }
    });
    console.log('   ✓ Challenge: Charlie → Bob (Eight Ball, First to 5)');

    // Eve proposes venue/time to Diana
    await prisma.challenge.create({
      data: {
        creatorId: createdUsers[4].id, // Eve
        targetUserId: createdUsers[3].id, // Diana
        discipline: 'Nine Ball',
        gamesToWin: 7,
        status: 'proposed',
        venue: 'Valley Hub',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      }
    });
    console.log('   ✓ Challenge: Eve → Diana (Nine Ball, First to 7, Valley Hub)');

    // Create a completed match for history
    console.log('\n🎯 Creating sample match history...');
    await prisma.match.create({
      data: {
        player1Id: createdUsers[0].id, // Alice
        player2Id: createdUsers[5].id, // Frank
        discipline: 'Eight Ball',
        gamesToWin: 5,
        venue: 'Eagles 4040',
        scores: {
          frames: [
            { winner: 'player1', score: [1, 0] },
            { winner: 'player2', score: [1, 1] },
            { winner: 'player1', score: [2, 1] },
            { winner: 'player1', score: [3, 1] },
            { winner: 'player2', score: [3, 2] },
            { winner: 'player1', score: [4, 2] },
            { winner: 'player1', score: [5, 2] }
          ]
        },
        status: 'completed',
        winnerId: createdUsers[0].id,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    });
    console.log('   ✓ Match: Alice def. Frank 5-2 (Eight Ball at Eagles 4040)');

    console.log('\n✅ Demo data setup complete!');
    console.log('\n📋 Demo Accounts Created:');
    console.log('┌─────────────────────┬───────────────────┬────────┬──────┐');
    console.log('│ Email               │ Display Name      │ Rank   │ Pass │');
    console.log('├─────────────────────┼───────────────────┼────────┼──────┤');

    DEMO_USERS.forEach(user => {
      console.log(
        `│ ${user.email.padEnd(19)} │ ${user.displayName.padEnd(17)} │ #${user.rank.toString().padStart(5)} │ ${user.password} │`
      );
    });

    console.log('└─────────────────────┴───────────────────┴────────┴──────┘');

    console.log('\n🎯 Demo Features Ready:');
    console.log('   • Ranked leaderboard with 8 players');
    console.log('   • Active challenges (Charlie → Bob, Eve → Diana)');
    console.log('   • Match history (Alice vs Frank completed)');
    console.log('   • Live match creation and scoring');
    console.log('   • Real-time notifications via Socket.IO');

    console.log('\n🚀 Ready to demo! Start the server with: npm start');
  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupDemoData();
}

module.exports = { setupDemoData };
