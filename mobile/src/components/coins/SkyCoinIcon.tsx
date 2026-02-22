import React from 'react';
import KindnessCoin from './KindnessCoin';

// ═══════════════════════════════════════════════════════════════════════
// SKY COIN — SINGLE SOURCE OF TRUTH
//
// Import this component EVERYWHERE Sky Coins are displayed.
// To change the visual, edit ONLY this file.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Canonical Sky Coin color palette.
 * Use these in animations, sparkles, gradients — anywhere you reference
 * the Sky Coin brand outside of the icon itself.
 */
export const SKY_COIN_COLORS = {
  /** Three-stop rim gradient for the coin art (light → mid → dark) */
  rim: ['#7DD3FC', '#38BDF8', '#0EA5E9'] as [string, string, string],
  /** Three-stop face gradient for the coin art */
  face: ['#BAE6FD', '#7DD3FC', '#0EA5E9'] as [string, string, string],
  /** Primary brand color (use for single-color contexts) */
  primary: '#38BDF8',
  /** Lighter tint */
  light: '#BAE6FD',
  /** Mid tint */
  mid: '#7DD3FC',
  /** Darker shade */
  dark: '#0EA5E9',
  /** Darkest shade */
  deepDark: '#0369A1',
  /** Card background gradient (3-stop) */
  cardGradient: ['#38BDF8', '#0EA5E9', '#0369A1'] as [string, string, string],
};

// ───────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────

interface SkyCoinIconProps {
  /**
   * Display size in dp — the coin diameter.
   * - Large sizes (32, 48) for cards, modals, counters.
   * - Small sizes (11, 14, 16) for price badges / inline use.
   */
  size: number;
  /**
   * Visual variant:
   * - **coin**   — Default. Full circular coin art.
   * - **inline** — Same coin art, intended for small inline contexts.
   */
  variant?: 'coin' | 'inline';
  /** Optional wrapping style (positioning, animation transforms, etc.) */
  style?: any;
}

export default function SkyCoinIcon({
  size,
  style,
}: SkyCoinIconProps) {
  return (
    <KindnessCoin
      size={size}
      rimColors={SKY_COIN_COLORS.rim}
      faceColors={SKY_COIN_COLORS.face}
      style={style}
    />
  );
}
