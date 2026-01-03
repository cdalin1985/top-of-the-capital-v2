import { checkChallengeEligibility, calculateEngagementPoints } from '../src/lib/logic';

describe('Challenge Logic', () => {
    test('±5 rule applies correctly', () => {
        expect(checkChallengeEligibility(10, 5, null).eligible).toBe(true);
        expect(checkChallengeEligibility(10, 15, null).eligible).toBe(true);
        expect(checkChallengeEligibility(10, 4, null).eligible).toBe(false);
        expect(checkChallengeEligibility(10, 16, null).eligible).toBe(false);
    });

    test('#1 rank can challenge anyone', () => {
        expect(checkChallengeEligibility(1, 100, null).eligible).toBe(true);
    });

    test('cooldown prevents challenge', () => {
        const future = new Date(Date.now() + 3600000).toISOString();
        expect(checkChallengeEligibility(10, 12, future).eligible).toBe(false);
    });
});

describe('Point System', () => {
    test('awards correct points', () => {
        expect(calculateEngagementPoints('challenge')).toBe(2);
        expect(calculateEngagementPoints('play')).toBe(1);
        expect(calculateEngagementPoints('win')).toBe(3);
    });
});
