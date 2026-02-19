import { AssetFile, Media } from '@/utils/types/media';

type Derivatives = Record<string, AssetFile | undefined>;

const IMAGE_360_GROUP = ['webp_360', 'webp_small'];
const IMAGE_720_GROUP = ['webp_720', 'webp_medium'];
const IMAGE_1080_GROUP = ['webp_1080', 'webp_large'];

const VIDEO_360_GROUP = ['webm_360'];
const VIDEO_720_GROUP = ['webm_720'];
const VIDEO_1080_GROUP = ['webm_1080'];

function firstAvailable(items: Array<AssetFile | undefined | null>) {
  return items.find((item) => item?.storagePath);
}

function pickFromGroup(derivatives: Derivatives, group: string[]) {
  return firstAvailable(group.map((key) => derivatives[key]));
}

export function selectImageAssets(media: Media, useMobilePriorities: boolean) {
  const derivatives = media.paths?.derivatives ?? {};
  const g360 = pickFromGroup(derivatives, IMAGE_360_GROUP);
  const g720 = pickFromGroup(derivatives, IMAGE_720_GROUP);
  const g1080 = pickFromGroup(derivatives, IMAGE_1080_GROUP);
  const original = media.paths?.original;

  const lowPriorityOrderMobile = [g720, g1080, original];
  const lowPriorityOrderDesktop = [g720, g1080, g360, original];

  const highPriorityOrderMobile = [g720, g1080, g360, original];
  const highPriorityOrderDesktop = [g1080, g720, g360, original];

  return {
    low: firstAvailable(
      useMobilePriorities ? lowPriorityOrderMobile : lowPriorityOrderDesktop
    ),
    high: firstAvailable(
      useMobilePriorities ? highPriorityOrderMobile : highPriorityOrderDesktop
    ),
    original,
  };
}

export function selectVideoAssets(media: Media, useMobilePriorities: boolean) {
  const derivatives = media.paths?.derivatives ?? {};
  const v360 = pickFromGroup(derivatives, VIDEO_360_GROUP);
  const v720 = pickFromGroup(derivatives, VIDEO_720_GROUP);
  const v1080 = pickFromGroup(derivatives, VIDEO_1080_GROUP);
  const originalPoster = media.paths?.poster;
  const webpMedium = derivatives['webp_medium'];
  const webpLarge = derivatives['webp_large'];
  const webpSmall = derivatives['webp_small'];

  const lowPriorityOrderMobile = [v360, v720, v1080];
  const lowPriorityOrderDesktop = [v720, v1080, v360];

  const highPriorityOrderMobile = [v720, v1080, v360];
  const highPriorityOrderDesktop = [v1080, v720, v360];

  const posterOrder = [
    originalPoster,
    webpMedium,
    webpLarge,
    webpSmall,
    v720,
    v360,
  ];

  return {
    low: firstAvailable(
      useMobilePriorities ? lowPriorityOrderMobile : lowPriorityOrderDesktop
    ),
    high: firstAvailable(
      useMobilePriorities ? highPriorityOrderMobile : highPriorityOrderDesktop
    ),
    poster: firstAvailable(posterOrder),
  };
}
