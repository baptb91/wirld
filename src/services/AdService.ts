/**
 * AdService — thin wrapper around react-native-google-mobile-ads.
 *
 * Only rewarded ads are used. Resolves true when the user earns the reward,
 * false if they close early or if an error occurs (including simulator/test
 * environments where the native module may not be fully available).
 *
 * Test unit IDs (TestIds.REWARDED) are used throughout development.
 * Replace with real unit IDs before production release.
 */
import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const REWARDED_UNIT_ID = Platform.select({
  ios:     TestIds.REWARDED,
  android: TestIds.REWARDED,
  default: TestIds.REWARDED,
}) as string;

export const AdService = {
  /**
   * Load and show a rewarded ad.
   * Resolves `true` only when EARNED_REWARD fires before the ad closes.
   * Always resolves (never rejects) so callers can use `await` without try/catch.
   */
  showRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ad = RewardedAd.createForAdRequest(REWARDED_UNIT_ID, {
          requestNonPersonalizedAdsOnly: true,
        });

        let rewarded = false;
        const unsubs: Array<() => void> = [];

        const cleanup = () => {
          unsubs.forEach((fn) => fn());
        };

        unsubs.push(
          ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            ad.show().catch(() => {
              cleanup();
              resolve(false);
            });
          }),
        );

        unsubs.push(
          ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
            rewarded = true;
          }),
        );

        unsubs.push(
          ad.addAdEventListener(AdEventType.CLOSED, () => {
            cleanup();
            resolve(rewarded);
          }),
        );

        unsubs.push(
          ad.addAdEventListener(AdEventType.ERROR, () => {
            cleanup();
            resolve(false);
          }),
        );

        ad.load();
      } catch {
        resolve(false);
      }
    });
  },
};
