// RevenueCat subscription helpers
// Requires react-native-purchases to be installed and configured

import { useAppStore } from './store';

const ENTITLEMENT_ID = 'premium';

/**
 * Initialize RevenueCat. Call once at app startup.
 * Uncomment and configure when ready to add RevenueCat.
 */
export async function initializeSubscriptions() {
  // import Purchases from 'react-native-purchases';
  // Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });
}

/**
 * Check if user has active premium subscription.
 */
export async function checkPremiumStatus(): Promise<boolean> {
  // import Purchases from 'react-native-purchases';
  // const customerInfo = await Purchases.getCustomerInfo();
  // const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  // useAppStore.getState().setIsPremium(isPremium);
  // return isPremium;

  // Stub: returns false until RevenueCat is configured
  return false;
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<boolean> {
  // import Purchases from 'react-native-purchases';
  // const customerInfo = await Purchases.restorePurchases();
  // const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  // useAppStore.getState().setIsPremium(isPremium);
  // return isPremium;
  return false;
}

/**
 * Get available subscription packages.
 */
export async function getOfferings() {
  // import Purchases from 'react-native-purchases';
  // const offerings = await Purchases.getOfferings();
  // return offerings.current?.availablePackages ?? [];
  return [];
}

/**
 * Purchase a subscription package.
 */
export async function purchasePackage(_packageId: string): Promise<boolean> {
  // import Purchases from 'react-native-purchases';
  // const { customerInfo } = await Purchases.purchasePackage(pkg);
  // const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  // useAppStore.getState().setIsPremium(isPremium);
  // return isPremium;
  return false;
}
