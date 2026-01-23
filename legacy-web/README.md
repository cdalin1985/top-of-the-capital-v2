# Top of the Capital - Pool Challenge Application

A sophisticated pool league management system with real-time challenges, rankings, and player authentication.

## 🎯 Overview

Top of the Capital is a professional pool challenge application designed for the Valley Hub Eagles 4040 league. It features a beautiful green and gray UI, real-time player interactions, and a comprehensive ranking system with 70 real players.

## ✨ Features

### 🏆 Core Functionality
- **70 Real Players**: Complete rankings from Dan Hamper (#1) to Kelly Smail (#70)
- **Smart Authentication**: Auto-detects existing vs new users
- **Real-time Challenges**: Live challenge system with Socket.IO
- **Professional Dashboard**: 4-panel layout with rankings, notifications, activity feed, and challenge system
- **Avatar System**: Profile photo upload and management

### 🎨 Design
- **Elegant UI**: Sophisticated green and gray color scheme
- **Professional Typography**: Cinzel Decorative and Cormorant Garamond fonts
- **Responsive Design**: Works on desktop and mobile devices
- **Clean Interface**: No distracting animations, professional appearance

### 🔐 Authentication
- **Dropdown Selection**: Choose from 70 real player names
- **Smart Detection**: Automatically shows login or signup form
- **Secure Passwords**: bcrypt hashing with JWT tokens
- **Avatar Upload**: Optional profile photo during registration

## 🚀 Live Demo

**Website**: [https://19hninc8n585.manus.space](https://19hninc8n585.manus.space )

## 🛠️ Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: Vanilla JavaScript with Socket.IO
- **Database**: JSON file-based storage
- **Authentication**: JWT with bcrypt
- **Styling**: Custom CSS with Google Fonts
- **Real-time**: Socket.IO for live updates

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/cdalin1985/top-of-the-capital-v2.git
cd top-of-the-capital-v2

# Install dependencies
npm install

# Start the server
npm start
# or
PORT=3000 node server.js
