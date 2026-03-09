import { AvatarConfigSQL } from '../models/AvatarConfigSQL';

/**
 * Format an AvatarConfigSQL model instance into the API response shape
 * expected by the mobile AvatarRenderer component.
 */
export function formatAvatarForResponse(avatar: AvatarConfigSQL | null) {
  if (!avatar) return null;
  return {
    id: avatar.id,
    style: avatar.style,
    customizations: {
      skinTone: avatar.skinTone,
      eyeColor: avatar.eyeColor,
      eyeSize: avatar.eyeSize,
      hairColor: avatar.hairColor,
      hairStyle: avatar.hairStyle,
      accessories: {
        glasses: avatar.glasses,
        hat: avatar.hat,
        earrings: avatar.earrings,
      },
      gender: avatar.gender || null,
      faceShape: avatar.faceShape || null,
      facialHair: avatar.facialHair || null,
      eyebrowStyle: avatar.eyebrowStyle || null,
      mouthStyle: avatar.mouthStyle || null,
      noseStyle: avatar.noseStyle || null,
    },
  };
}
