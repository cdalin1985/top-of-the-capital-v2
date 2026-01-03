export function checkChallengeEligibility(challengerRank: number, targetRank: number, cooldownUntil: string | null): { eligible: boolean; error?: string } {
    // 1. Cooldown Check
    if (cooldownUntil && new Date(cooldownUntil) > new Date()) {
        return { eligible: false, error: 'You are on a 24-hour cooldown after your last loss.' };
    }

    // 2. #1 Rule
    if (challengerRank === 1) {
        return { eligible: true };
    }

    // 3. ±5 Rule
    const diff = Math.abs(challengerRank - targetRank);
    if (diff <= 5) {
        return { eligible: true };
    }

    return { eligible: false, error: 'You can only challenge players within ±5 spots of your current rank.' };
}

export function calculateEngagementPoints(action: 'challenge' | 'play' | 'win'): number {
    switch (action) {
        case 'challenge': return 2;
        case 'play': return 1;
        case 'win': return 3;
        default: return 0;
    }
}
