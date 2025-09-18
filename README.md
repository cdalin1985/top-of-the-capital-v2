# 🎱 Capital Ladder App - Demo

**Helena's King of the Hill Pool League Management System**

A professional pool league management application with real-time match scoring,
challenge system, and ranked leaderboards.

## 🚀 Quick Start Demo

```bash
npm install
npm run demo
```

Open your browser to: **http://localhost:3001**

## 🎯 Demo Login Accounts

| Email              | Password   | Rank | Player         |
| ------------------ | ---------- | ---- | -------------- |
| `alice@demo.com`   | `demo1234` | #1   | Alice Champion |
| `bob@demo.com`     | `demo1234` | #2   | Bob Striker    |
| `charlie@demo.com` | `demo1234` | #3   | Charlie Rookie |

_All demo accounts use password: `demo1234`_

## ✨ Key Features to Demo

### 🏆 **Ranked Leaderboard**

- Ziggurat-style visual hierarchy
- 8 demo players with skill rankings
- Clickable entries for challenge targeting

### ⚔️ **Challenge System**

- Create challenges with venue/time scheduling
- Real-time notifications via Socket.IO
- Accept/decline/counter-propose workflow

### 🎯 **Live Match Scoring**

- Professional frame-by-frame scoring interface
- Real-time multi-device synchronization
- Touch-optimized for mobile scoring
- Automatic match completion with celebrations

### 📱 **Mobile Responsive**

- Optimized for pool halls and mobile devices
- Touch-friendly scoring buttons
- Real-time sync across all devices

## 🔧 Manual Setup

```bash
# Setup demo data only
npm run setup-demo

# Start server normally
npm start
```

## 🎪 Demo Flow

1. **Login** as Alice → View ranked leaderboard
2. **Click Bob** → Challenge targeting
3. **Create Challenge** → Real-time notifications
4. **Switch to Bob** → Accept challenge workflow
5. **Create Live Match** → Professional scoring interface
6. **Score Match** → Real-time updates + celebration
7. **View History** → Match persistence

## 📋 Tech Stack

- **Backend:** Node.js, Express, Prisma, Socket.IO
- **Database:** SQLite (easy demo setup)
- **Frontend:** Vanilla JS, CSS Grid/Flexbox
- **Security:** JWT, Helmet, rate limiting
- **Real-time:** Socket.IO bi-directional sync

## 📖 Full Documentation

See [DEMO-GUIDE.md](DEMO-GUIDE.md) for comprehensive demo instructions and
technical details.

---

**Ready to showcase professional pool league management! 🎱**
