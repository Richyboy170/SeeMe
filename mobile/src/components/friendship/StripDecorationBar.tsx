import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
}

const FRAME_COLORS = [
  '#FFFFFF', '#FFE0EC', '#E8DEFF', '#D4F5E9', '#DBEEFF', '#FFE8D6',
  '#FF9AA2', '#FFD700', '#1A1A2E', '#2D2D2D', '#1B4332', '#7B2D3B',
];

const EMOJI_PALETTE = [
  '\u2764\uFE0F', '\uD83E\uDDE1', '\uD83D\uDC9B', '\uD83D\uDC9A', '\uD83D\uDC99', '\uD83D\uDC9C',
  '\uD83E\uDE77', '\u2B50', '\u2728', '\uD83D\uDCAB', '\uD83C\uDF1F', '\uD83D\uDD25',
  '\uD83C\uDF89', '\uD83C\uDF8A', '\uD83E\uDD8B', '\uD83C\uDF38', '\uD83C\uDF3A', '\uD83C\uDF3B',
  '\uD83D\uDC90', '\uD83C\uDF40', '\uD83D\uDE0A', '\uD83D\uDE04', '\uD83E\uDD70', '\uD83D\uDE0E',
  '\uD83E\uDD29', '\uD83D\uDCAA', '\uD83D\uDC51', '\uD83D\uDC8E', '\uD83C\uDF80', '\uD83E\uDE75',
];

interface StripDecorationBarProps {
  activeColor: string;
  onSelectColor: (color: string) => void;
  onAddSticker: (emoji: string) => void;
  onRemoveLastSticker?: () => void;
}

type Panel = 'none' | 'color' | 'emoji';

export default function StripDecorationBar({
  activeColor,
  onSelectColor,
  onAddSticker,
  onRemoveLastSticker,
}: StripDecorationBarProps) {
  const { colors } = useTheme();
  const [activePanel, setActivePanel] = useState<Panel>('none');

  const togglePanel = (panel: 'color' | 'emoji') => {
    setActivePanel(prev => (prev === panel ? 'none' : panel));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Toggle buttons */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { borderColor: colors.border },
            activePanel === 'color' && { backgroundColor: colors.text.link + '20', borderColor: colors.text.link },
          ]}
          onPress={() => togglePanel('color')}
        >
          <Ionicons
            name="color-palette-outline"
            size={20}
            color={activePanel === 'color' ? colors.text.link : colors.text.secondary}
          />
          <Text style={[
            styles.toggleLabel,
            { color: activePanel === 'color' ? colors.text.link : colors.text.secondary },
          ]}>
            Frame
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { borderColor: colors.border },
            activePanel === 'emoji' && { backgroundColor: colors.text.link + '20', borderColor: colors.text.link },
          ]}
          onPress={() => togglePanel('emoji')}
        >
          <Text style={{ fontSize: 18 }}>{'\u2728'}</Text>
          <Text style={[
            styles.toggleLabel,
            { color: activePanel === 'emoji' ? colors.text.link : colors.text.secondary },
          ]}>
            Stickers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Frame color panel */}
      {activePanel === 'color' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.panelContent}
          style={styles.panel}
        >
          {FRAME_COLORS.map(color => {
            const isActive = activeColor === color;
            const isWhite = color === '#FFFFFF';
            return (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  isWhite && { borderWidth: 1, borderColor: '#DDD' },
                  isActive && { borderWidth: 2.5, borderColor: colors.text.link },
                ]}
                onPress={() => onSelectColor(color)}
              >
                {isActive && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={isLightColor(color) ? '#333' : '#FFF'}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Emoji panel */}
      {activePanel === 'emoji' && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.panelContent}
            style={styles.panel}
          >
            {EMOJI_PALETTE.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.emojiBtn}
                onPress={() => onAddSticker(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {onRemoveLastSticker && (
            <TouchableOpacity
              style={[styles.undoBtn, { borderColor: colors.border }]}
              onPress={onRemoveLastSticker}
            >
              <Ionicons name="arrow-undo-outline" size={14} color={colors.text.secondary} />
              <Text style={[styles.undoText, { color: colors.text.secondary }]}>
                Undo last sticker
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 >= 0.5;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 20,
    width: '100%',
    maxWidth: 320,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  panel: {
    marginTop: 12,
  },
  panelContent: {
    gap: 10,
    paddingHorizontal: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 24,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  undoText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
