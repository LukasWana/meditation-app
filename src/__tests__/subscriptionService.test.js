/**
 * Unit testy pro subscriptionService
 * Tarif se bere jen z custom claims (nastavuje server), ne z Firestore profilu.
 */
import { describe, it, expect } from 'vitest';
import subscriptionService from '../services/subscriptionService';

describe('subscriptionService', () => {
  it('bez uživatele vrací free', () => {
    expect(subscriptionService.getSubscription(null).plan).toBe('free');
  });

  it('tarif z custom claims', () => {
    const tokenResult = { claims: { subscription: 'pro' } };
    expect(subscriptionService.getSubscription('uid', tokenResult)).toMatchObject({
      plan: 'pro',
      source: 'claims'
    });
  });

  it('bez claimu je free', () => {
    expect(subscriptionService.getSubscription('uid', { claims: {} }).plan).toBe('free');
  });

  it('hasFeature: premium z claims má přístup', () => {
    const tokenResult = { claims: { subscription: 'premium' } };
    expect(subscriptionService.hasFeature('uid', tokenResult, 'any')).toBe(true);
  });

  it('hasFeature: free nemá přístup, admin ano', () => {
    expect(subscriptionService.hasFeature('uid', { claims: {} }, 'any')).toBe(false);
    expect(subscriptionService.hasFeature('uid', { claims: { admin: true } }, 'any')).toBe(true);
  });
});
