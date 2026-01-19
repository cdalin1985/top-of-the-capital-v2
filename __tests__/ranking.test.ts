import { checkChallengeEligibility } from '../src/lib/logic';

describe('Ranking System', () => {
  describe('Challenge Eligibility - Plus/Minus 5 Rule', () => {
    test('can challenge exactly 5 ranks above', () => {
      expect(checkChallengeEligibility(10, 5, null).eligible).toBe(true);
    });

    test('can challenge exactly 5 ranks below', () => {
      expect(checkChallengeEligibility(10, 15, null).eligible).toBe(true);
    });

    test('can challenge same rank (edge case)', () => {
      expect(checkChallengeEligibility(10, 10, null).eligible).toBe(true);
    });

    test('cannot challenge 6 ranks above', () => {
      const result = checkChallengeEligibility(10, 4, null);
      expect(result.eligible).toBe(false);
      expect(result.error).toContain('5 spots');
    });

    test('cannot challenge 6 ranks below', () => {
      const result = checkChallengeEligibility(10, 16, null);
      expect(result.eligible).toBe(false);
    });

    test('rank boundaries - rank 3 can challenge rank 1', () => {
      expect(checkChallengeEligibility(3, 1, null).eligible).toBe(true);
    });

    test('rank boundaries - rank 6 cannot challenge rank 1', () => {
      expect(checkChallengeEligibility(6, 1, null).eligible).toBe(false);
    });
  });

  describe('Rank #1 Special Rule', () => {
    test('rank 1 can challenge rank 50', () => {
      expect(checkChallengeEligibility(1, 50, null).eligible).toBe(true);
    });
    
    test('rank 1 can challenge rank 100', () => {
      expect(checkChallengeEligibility(1, 100, null).eligible).toBe(true);
    });
    
    test('rank 1 can challenge rank 2', () => {
      expect(checkChallengeEligibility(1, 2, null).eligible).toBe(true);
    });
  });

  describe('Cooldown System', () => {
    test('active cooldown prevents challenge', () => {
      const futureTime = new Date(Date.now() + 3600000).toISOString();
      const result = checkChallengeEligibility(10, 12, futureTime);
      expect(result.eligible).toBe(false);
      expect(result.error).toContain('cooldown');
    });

    test('expired cooldown allows challenge', () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString();
      expect(checkChallengeEligibility(10, 12, pastTime).eligible).toBe(true);
    });

    test('null cooldown allows challenge', () => {
      expect(checkChallengeEligibility(10, 12, null).eligible).toBe(true);
    });
  });
});
