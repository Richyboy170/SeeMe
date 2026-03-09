export interface ProfileGuideStep {
  key: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  tooltipPosition: 'above' | 'below';
  scrollToTarget?: boolean;
}

export const PROFILE_GUIDE_STEPS: ProfileGuideStep[] = [
  {
    key: 'avatarSection',
    title: 'Your Avatar',
    description:
      'Your profile picture with a rank-colored ring. Tap to view full screen, or upload a new photo.',
    icon: 'happy-outline',
    tooltipPosition: 'below',
  },
  {
    key: 'statsRow',
    title: 'Your Stats',
    description:
      'See your total posts, followers, and following counts. Tap any stat to view the full list.',
    icon: 'bar-chart-outline',
    tooltipPosition: 'below',
  },
  {
    key: 'rankBar',
    title: 'Rank & Coins',
    description:
      'Your positivity rank and Kindness Coins given and received. Keep being kind to rank up!',
    icon: 'ribbon-outline',
    tooltipPosition: 'below',
  },
  {
    key: 'actionButtons',
    title: 'Edit & Share',
    description:
      'Edit Profile to update your photo, bio, and settings. Share to send your profile card to friends.',
    icon: 'create-outline',
    tooltipPosition: 'below',
  },
];
