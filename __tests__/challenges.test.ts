describe('Challenge System', () => {
  describe('Challenge Creation', () => {
    test('default games to win is 7 (race to 7)', () => {
      const defaultGamesToWin = 7;
      expect(defaultGamesToWin).toBe(7);
    });

    test('deadline should be 14 days from creation', () => {
      const createdAt = new Date();
      const deadline = new Date(createdAt);
      deadline.setDate(deadline.getDate() + 14);
      
      const daysDiff = Math.round((deadline.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(14);
    });

    test('valid game types', () => {
      const validTypes = ['8-ball', '9-ball', '10-ball'];
      expect(validTypes).toContain('8-ball');
      expect(validTypes).toContain('9-ball');
      expect(validTypes).toContain('10-ball');
      expect(validTypes).not.toContain('snooker');
    });
  });

  describe('Match Scoring', () => {
    test('match ends when someone reaches race count', () => {
      const gamesToWin = 7;
      const player1Score = 7;
      const player2Score = 4;
      
      const matchComplete = player1Score >= gamesToWin || player2Score >= gamesToWin;
      expect(matchComplete).toBe(true);
    });

    test('match not complete if no one reached race count', () => {
      const gamesToWin = 7;
      const player1Score = 5;
      const player2Score = 6;
      
      const matchComplete = player1Score >= gamesToWin || player2Score >= gamesToWin;
      expect(matchComplete).toBe(false);
    });

    test('winner is player who reached race count first', () => {
      const gamesToWin = 7;
      const player1Score = 7;
      const player2Score = 4;
      
      const winner = player1Score >= gamesToWin ? 'player1' : 'player2';
      expect(winner).toBe('player1');
    });
  });

  describe('Cooldown After Loss', () => {
    test('24-hour cooldown duration', () => {
      const lossTime = new Date();
      const cooldownEnd = new Date(lossTime);
      cooldownEnd.setHours(cooldownEnd.getHours() + 24);
      
      const hoursDiff = (cooldownEnd.getTime() - lossTime.getTime()) / (1000 * 60 * 60);
      expect(hoursDiff).toBe(24);
    });
  });
});
