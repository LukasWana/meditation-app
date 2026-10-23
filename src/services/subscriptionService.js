/**
 * Služba pro správu subscription (příprava na budoucí platby)
 */
class SubscriptionService {
  /**
   * Získá subscription informace z custom claims
   */
  getSubscription(userId, tokenResult = null) {
    if (!userId) {
      return this.getDefaultSubscription();
    }

    // Jen z custom claims — nastavuje je server. Pole subscription v users/{uid}
    // si uživatel může zapsat sám, proto se z Firestore nečte.
    if (tokenResult?.claims?.subscription) {
      return {
        plan: tokenResult.claims.subscription,
        status: 'active',
        source: 'claims'
      };
    }

    return this.getDefaultSubscription();
  }

  /**
   * Vrátí výchozí free subscription
   */
  getDefaultSubscription() {
    return {
      plan: 'free',
      status: 'active',
      features: [],
      source: 'default'
    };
  }

  /**
   * Zkontroluje, zda má uživatel přístup k premium funkci
   */
  hasFeature(userId, tokenResult, feature) {
    if (!userId) return false;

    // Admin má vždy přístup ke všemu
    if (tokenResult?.claims?.admin) {
      return true;
    }

    // Premium/Pro mají přístup ke všem funkcím
    const subscription = this.getSubscription(userId, tokenResult);
    if (subscription.plan === 'premium' || subscription.plan === 'pro') {
      return true;
    }

    // Kontrola konkrétní funkce
    if (subscription.features && Array.isArray(subscription.features)) {
      return subscription.features.includes(feature);
    }

    return false;
  }

  /**
   * Zkontroluje, zda je subscription aktivní
   */
  isActive(subscription) {
    if (!subscription) return false;
    if (subscription.status !== 'active') return false;

    // Kontrola expirace
    if (subscription.expiresAt) {
      const expiresAt = subscription.expiresAt.toDate ? subscription.expiresAt.toDate() : new Date(subscription.expiresAt);
      return expiresAt > new Date();
    }

    return true;
  }

  /**
   * Seznam dostupných funkcí pro jednotlivé plány
   */
  getPlanFeatures(plan) {
    const features = {
      free: [
        'basic_meditations',
        'breathing_exercises',
        'local_settings'
      ],
      premium: [
        'basic_meditations',
        'breathing_exercises',
        'local_settings',
        'unlimited_downloads',
        'premium_meditations',
        'cloud_sync',
        'advanced_profiles'
      ],
      pro: [
        'basic_meditations',
        'breathing_exercises',
        'local_settings',
        'unlimited_downloads',
        'premium_meditations',
        'cloud_sync',
        'advanced_profiles',
        'priority_support',
        'exclusive_content'
      ]
    };

    return features[plan] || features.free;
  }
}

const subscriptionService = new SubscriptionService();
export default subscriptionService;





