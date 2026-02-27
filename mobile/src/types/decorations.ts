export interface CornerDecorationConfig {
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons';
  iconName: string;
  size: number;
  color: string;
  opacity?: number;
}

export interface BinderIconConfig {
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons';
  iconName: string;
  color: string;
}

export interface DecorationStyleBackground {
  type: 'gradient' | 'solid';
  colors?: string[];
  color?: string;
  locations?: number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  textColor: string;
  captionColor: string;
  cornerDecorations?: CornerDecorationConfig;
  binderIcon?: BinderIconConfig;
}

export interface DecorationStyleFrame {
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowRadius?: number;
  cornerDecorations?: CornerDecorationConfig;
  patternType?: string;
}

export interface DecorationStyleIconColors {
  likeColor: string;
  commentColor: string;
  shareColor: string;
  saveColor: string;
  giftColor: string;
}

export type CornerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface CornerIconPlacement {
  position: CornerPosition;
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons';
  iconName: string;
  color: string;
}

export interface CornerIconPurchase {
  id: string;
  userId: string;
  iconFamily: string;
  iconName: string;
  pricePaid: number;
  purchasedAt: string;
}

export interface ResolvedDecoration {
  lightBackground: DecorationStyleBackground | null;
  darkBackground: DecorationStyleBackground | null;
  frame: DecorationStyleFrame | null;
  iconColors: DecorationStyleIconColors | null;
  cornerIcons: CornerIconPlacement[] | null;
}

export interface StoreDecoration {
  id: string;
  name: string;
  category: 'background' | 'frame' | 'icon_color';
  themeMode: 'light' | 'dark' | 'any';
  priceSkyCoins: number;
  previewOrder: number;
  styleData: string; // JSON string
  isActive: boolean;
}

export interface UserOwnedDecoration {
  id: string;
  userId: string;
  decorationId: string;
  purchasedAt: string;
  pricePaid: number;
  decoration: StoreDecoration;
}

export interface ActiveDecorationConfig {
  userId: string;
  lightBackgroundId: string | null;
  darkBackgroundId: string | null;
  frameId: string | null;
  iconColorId: string | null;
  // Resolved decoration data
  lightBackground?: StoreDecoration | null;
  darkBackground?: StoreDecoration | null;
  frame?: StoreDecoration | null;
  iconColor?: StoreDecoration | null;
}
