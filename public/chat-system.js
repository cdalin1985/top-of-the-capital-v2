/**
 * Chat System with @Username Tagging
 * Real-time community chat integrated with notifications dashboard
 */

class ChatSystem {
  constructor() {
    this.messages = [];
    this.currentUser = null;
    this.onlineUsers = new Map();
    this.chatContainer = null;
    this.messageInput = null;
    this.isTyping = false;
    this.typingTimeout = null;
    this.socket = null;

    this.init();
  }

  init() {
    console.log('Chat System initialized');
    this.setupChatUI();
    this.loadMockUsers();
    this.loadMockMessages();

    // Wait for app to be ready
    setTimeout(() => {
      this.setupEventListeners();
      this.connectSocket();
    }, 1000);
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (this.currentUser) {
      this.onlineUsers.set(this.currentUser.info.id, {
        id: this.currentUser.info.id,
        name: this.currentUser.info.displayName,
        lastSeen: new Date(),
        isOnline: true
      });
    }
  }

  setupChatUI() {
    // Transform the community notifications area into a chat system
    const communityCard = document.getElementById('community-notifications');
    if (communityCard) {
      const cardTitle = communityCard.querySelector('h3');
      if (cardTitle) {
        cardTitle.innerHTML = '💬 Community Chat';
      }

      // Replace community feed with chat interface
      const feedContainer = document.getElementById('community-feed');
      if (feedContainer) {
        feedContainer.innerHTML = `
                    <div class="chat-container">
                        <div class="chat-messages" id="chatMessages">
                            <!-- Messages will be populated here -->
                        </div>
                        <div class="chat-input-container">
                            <div class="typing-indicator" id="typingIndicator" style="display: none;">
                                <span class="typing-dots">
                                    <span></span><span></span><span></span>
                                </span>
                                <span class="typing-text">Someone is typing...</span>
                            </div>
                            <div class="chat-input-wrapper">
                                <input 
                                    type="text" 
                                    id="chatInput" 
                                    class="chat-input" 
                                    placeholder="Type a message... @username to mention"
                                    maxlength="500"
                                />
                                <button id="sendMessage" class="send-button" disabled>
                                    <span class="send-icon">📤</span>
                                </button>
                            </div>
                            <div class="mention-suggestions" id="mentionSuggestions" style="display: none;">
                                <!-- Mention suggestions will appear here -->
                            </div>
                        </div>
                    </div>
                `;

        this.chatContainer = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('chatInput');
        this.setupChatInputBehavior();
      }
    }
  }

  setupChatInputBehavior() {
    if (!this.messageInput) {
      return;
    }

    const sendButton = document.getElementById('sendMessage');
    const mentionSuggestions = document.getElementById('mentionSuggestions');

    // Enable/disable send button based on input
    this.messageInput.addEventListener('input', e => {
      const value = e.target.value.trim();
      sendButton.disabled = !value;

      // Handle @mentions
      this.handleMentionTyping(e.target.value, e.target.selectionStart);

      // Handle typing indicator
      this.handleTypingIndicator();
    });

    // Send message on Enter
    this.messageInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send message on button click
    sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // Handle mention suggestions clicks
    document.addEventListener('click', e => {
      if (e.target.classList.contains('mention-suggestion-item')) {
        this.selectMention(e.target.dataset.userId, e.target.dataset.userName);
      } else if (!mentionSuggestions.contains(e.target)) {
        mentionSuggestions.style.display = 'none';
      }
    });

    // Handle keyboard navigation for mentions
    this.messageInput.addEventListener('keydown', e => {
      if (mentionSuggestions.style.display !== 'none') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateMentionSuggestions(e.key === 'ArrowDown' ? 1 : -1);
        } else if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          const selected = mentionSuggestions.querySelector('.mention-suggestion-item.selected');
          if (selected) {
            this.selectMention(selected.dataset.userId, selected.dataset.userName);
          }
        } else if (e.key === 'Escape') {
          mentionSuggestions.style.display = 'none';
        }
      }
    });
  }

  handleMentionTyping(text, cursorPos) {
    const mentionSuggestions = document.getElementById('mentionSuggestions');

    // Find @ symbol before cursor
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      mentionSuggestions.style.display = 'none';
      return;
    }

    const queryStart = lastAtIndex + 1;
    const query = textBeforeCursor.substring(queryStart);

    // Check if we're still in the same word (no spaces after @)
    if (query.includes(' ')) {
      mentionSuggestions.style.display = 'none';
      return;
    }

    // Show mention suggestions
    this.showMentionSuggestions(query, lastAtIndex);
  }

  showMentionSuggestions(query, atIndex) {
    const mentionSuggestions = document.getElementById('mentionSuggestions');
    const users = Array.from(this.onlineUsers.values());

    const filteredUsers = users
      .filter(
        user =>
          user.name.toLowerCase().includes(query.toLowerCase()) &&
          user.id !== this.currentUser?.info?.id
      )
      .slice(0, 5);

    if (filteredUsers.length === 0) {
      mentionSuggestions.style.display = 'none';
      return;
    }

    mentionSuggestions.innerHTML = filteredUsers
      .map(
        (user, index) => `
            <div class="mention-suggestion-item ${index === 0 ? 'selected' : ''}" 
                 data-user-id="${user.id}" 
                 data-user-name="${user.name}">
                <div class="suggestion-avatar">${this.getAvatarForUser(user.name)}</div>
                <div class="suggestion-info">
                    <div class="suggestion-name">${user.name}</div>
                    <div class="suggestion-status">${user.isOnline ? '🟢 Online' : '🔘 Offline'}</div>
                </div>
            </div>
        `
      )
      .join('');

    mentionSuggestions.style.display = 'block';
    mentionSuggestions.dataset.atIndex = atIndex;
  }

  navigateMentionSuggestions(direction) {
    const mentionSuggestions = document.getElementById('mentionSuggestions');
    const items = mentionSuggestions.querySelectorAll('.mention-suggestion-item');
    const currentSelected = mentionSuggestions.querySelector('.mention-suggestion-item.selected');

    if (!items.length) {
      return;
    }

    let newIndex = 0;
    if (currentSelected) {
      const currentIndex = Array.from(items).indexOf(currentSelected);
      newIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
      currentSelected.classList.remove('selected');
    }

    items[newIndex].classList.add('selected');
  }

  selectMention(userId, userName) {
    const mentionSuggestions = document.getElementById('mentionSuggestions');
    const atIndex = parseInt(mentionSuggestions.dataset.atIndex);
    const currentText = this.messageInput.value;

    // Find the end of the current @query
    const textAfterAt = currentText.substring(atIndex + 1);
    const spaceIndex = textAfterAt.indexOf(' ');
    const endIndex = spaceIndex === -1 ? currentText.length : atIndex + 1 + spaceIndex;

    // Replace @query with @username
    const newText =
      currentText.substring(0, atIndex) + `@${userName} ` + currentText.substring(endIndex);
    this.messageInput.value = newText;

    // Set cursor position after the mention
    const newCursorPos = atIndex + userName.length + 2;
    this.messageInput.setSelectionRange(newCursorPos, newCursorPos);

    mentionSuggestions.style.display = 'none';
    this.messageInput.focus();

    // Enable send button if there's text
    document.getElementById('sendMessage').disabled = !newText.trim();
  }

  handleTypingIndicator() {
    if (!this.isTyping) {
      this.isTyping = true;
      // In a real implementation, emit typing event to socket
    }

    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set timeout to stop typing indicator
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      // In a real implementation, emit stop typing event to socket
    }, 1000);
  }

  sendMessage() {
    if (!this.messageInput || !this.currentUser) {
      return;
    }

    const text = this.messageInput.value.trim();
    if (!text) {
      return;
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.currentUser.info.id,
      userName: this.currentUser.info.displayName,
      text: text,
      timestamp: new Date(),
      mentions: this.extractMentions(text),
      type: 'user'
    };

    this.addMessage(message);
    this.messageInput.value = '';
    document.getElementById('sendMessage').disabled = true;
    document.getElementById('mentionSuggestions').style.display = 'none';

    // In a real implementation, emit message to socket
    this.simulateSocketMessage(message);
  }

  extractMentions(text) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const userName = match[1];
      const user = Array.from(this.onlineUsers.values()).find(
        u => u.name.toLowerCase() === userName.toLowerCase()
      );
      if (user) {
        mentions.push({
          userId: user.id,
          userName: user.name,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return mentions;
  }

  addMessage(message) {
    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();

    // Play notification sound for mentions
    if (message.mentions.some(m => m.userId === this.currentUser?.info?.id)) {
      this.playNotificationSound();
    }
  }

  renderMessage(message) {
    if (!this.chatContainer) {
      return;
    }

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${message.userId === this.currentUser?.info?.id ? 'own-message' : 'other-message'}`;

    const isSystemMessage = message.type === 'system';
    const avatar = isSystemMessage ? '🤖' : this.getAvatarForUser(message.userName);
    const timeStr = this.formatTime(message.timestamp);
    const processedText = this.processMessageText(message.text, message.mentions);

    messageEl.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author ${isSystemMessage ? 'system-author' : ''}">${message.userName}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="message-text">${processedText}</div>
            </div>
        `;

    // Add animation
    messageEl.style.opacity = '0';
    messageEl.style.transform = 'translateY(20px)';
    this.chatContainer.appendChild(messageEl);

    // Trigger animation
    requestAnimationFrame(() => {
      messageEl.style.transition = 'all 0.3s ease';
      messageEl.style.opacity = '1';
      messageEl.style.transform = 'translateY(0)';
    });

    // Keep only last 100 messages for performance
    while (this.chatContainer.children.length > 100) {
      this.chatContainer.removeChild(this.chatContainer.firstChild);
    }
  }

  processMessageText(text, mentions) {
    if (!mentions || mentions.length === 0) {
      return this.escapeHtml(text);
    }

    let processedText = '';
    let lastIndex = 0;

    mentions.forEach(mention => {
      // Add text before mention
      processedText += this.escapeHtml(text.substring(lastIndex, mention.start));

      // Add highlighted mention
      const isSelfMention = mention.userId === this.currentUser?.info?.id;
      processedText += `<span class="mention ${isSelfMention ? 'self-mention' : ''}">@${mention.userName}</span>`;

      lastIndex = mention.end;
    });

    // Add remaining text
    processedText += this.escapeHtml(text.substring(lastIndex));

    return processedText;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(timestamp) {
    const now = new Date();
    const diff = now - timestamp;

    if (diff < 60000) {
      // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) {
      // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  }

  getAvatarForUser(userName) {
    // Generate colorful avatar based on username hash
    if (!userName) {
      return '👤';
    }

    const avatars = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍🚀', '👩‍🚀'];
    const colors = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪'];

    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = ((hash << 5) - hash + userName.charCodeAt(i)) & 0xffffffff;
    }

    return avatars[Math.abs(hash) % avatars.length];
  }

  scrollToBottom() {
    if (this.chatContainer) {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
  }

  playNotificationSound() {
    // Use audio manager if available
    if (window.audioManager && window.audioManager.playNotification) {
      window.audioManager.playNotification();
    }
  }

  loadMockUsers() {
    // Add some mock online users
    const mockUsers = [
      { id: 'user1', name: 'Sarah Williams', isOnline: true },
      { id: 'user2', name: 'Mike Chen', isOnline: true },
      { id: 'user3', name: 'David Rodriguez', isOnline: false },
      { id: 'user4', name: 'Emily Johnson', isOnline: true },
      { id: 'user5', name: 'Chris Thompson', isOnline: false },
      { id: 'user6', name: 'Lisa Anderson', isOnline: true },
      { id: 'user7', name: 'James Wilson', isOnline: true },
      { id: 'user8', name: 'Maria Garcia', isOnline: false }
    ];

    mockUsers.forEach(user => {
      this.onlineUsers.set(user.id, {
        ...user,
        lastSeen: user.isOnline ? new Date() : new Date(Date.now() - Math.random() * 86400000)
      });
    });
  }

  loadMockMessages() {
    // Add some sample messages to show the chat in action
    const sampleMessages = [
      {
        id: 'msg1',
        userId: 'user1',
        userName: 'Sarah Williams',
        text: 'Hey everyone! Great games tonight at Valley Hub! 🎱',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        mentions: [],
        type: 'user'
      },
      {
        id: 'msg2',
        userId: 'user2',
        userName: 'Mike Chen',
        text: 'Absolutely! @Sarah that final shot was incredible 👏',
        timestamp: new Date(Date.now() - 1500000), // 25 minutes ago
        mentions: [{ userId: 'user1', userName: 'Sarah', start: 12, end: 18 }],
        type: 'user'
      },
      {
        id: 'msg3',
        userId: 'system',
        userName: 'System',
        text: 'Emily Johnson just climbed to #3 on the leaderboard! 🏆',
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        mentions: [],
        type: 'system'
      },
      {
        id: 'msg4',
        userId: 'user4',
        userName: 'Emily Johnson',
        text: 'Thanks everyone! Still can\'t believe I beat @Mike in that 9-ball match 😅',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        mentions: [{ userId: 'user2', userName: 'Mike', start: 43, end: 48 }],
        type: 'user'
      },
      {
        id: 'msg5',
        userId: 'user6',
        userName: 'Lisa Anderson',
        text: 'Who\'s up for some practice at Eagles tomorrow? Looking to work on my break shot 🎯',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        mentions: [],
        type: 'user'
      }
    ];

    // Load messages with a delay to simulate real-time loading
    sampleMessages.forEach((message, index) => {
      setTimeout(() => {
        this.messages.push(message);
        this.renderMessage(message);
      }, index * 200);
    });

    setTimeout(
      () => {
        this.scrollToBottom();
      },
      sampleMessages.length * 200 + 100
    );
  }

  simulateSocketMessage(message) {
    // Simulate receiving the message through socket after a brief delay
    setTimeout(() => {
      // In a real implementation, this would be handled by socket listeners
      console.log('Message sent via socket:', message);
    }, 100);
  }

  connectSocket() {
    // Socket integration placeholder
    // In a real implementation, connect to the existing socket.io instance
    if (window.socket) {
      this.socket = window.socket;
      this.setupSocketListeners();
    }
  }

  setupSocketListeners() {
    if (!this.socket) {
      return;
    }

    this.socket.on('chatMessage', message => {
      if (message.userId !== this.currentUser?.info?.id) {
        this.addMessage(message);
      }
    });

    this.socket.on('userJoined', user => {
      this.onlineUsers.set(user.id, { ...user, isOnline: true, lastSeen: new Date() });
      this.addSystemMessage(`${user.name} joined the chat`);
    });

    this.socket.on('userLeft', user => {
      if (this.onlineUsers.has(user.id)) {
        this.onlineUsers.get(user.id).isOnline = false;
        this.addSystemMessage(`${user.name} left the chat`);
      }
    });
  }

  addSystemMessage(text) {
    const message = {
      id: `sys_${Date.now()}`,
      userId: 'system',
      userName: 'System',
      text: text,
      timestamp: new Date(),
      mentions: [],
      type: 'system'
    };
    this.addMessage(message);
  }

  setupEventListeners() {
    // Additional event listeners can be added here
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.chatContainer) {
        this.scrollToBottom();
      }
    });
  }
}

// Initialize chat system
window.chatSystem = new ChatSystem();

// Global functions for external access
window.sendChatMessage = text => {
  if (window.chatSystem.messageInput) {
    window.chatSystem.messageInput.value = text;
    window.chatSystem.sendMessage();
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatSystem;
}
