import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import SkyCoinIcon, { SKY_COIN_COLORS } from './coins/SkyCoinIcon';
import { useTheme } from '../theme';
import {
  StoreDecoration,
  DecorationStyleBackground,
  DecorationStyleFrame,
  DecorationStyleIconColors,
  CornerDecorationConfig,
} from '../types/decorations';
import CornerDecorations from './CornerDecorations';

// ─── Types ───────────────────────────────────────────────────────────

interface DecorationPreviewProps {
  visible: boolean;
  item: StoreDecoration | null;
  isOwned: boolean;
  isActive: boolean;
  skyCoins: number;
  onClose: () => void;
  onPurchase: (item: StoreDecoration) => void;
  onEquip: (item: StoreDecoration) => void;
  onUnequip: (item: StoreDecoration) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function DecorationPreview({
  visible,
  item,
  isOwned,
  isActive,
  skyCoins,
  onClose,
  onPurchase,
  onEquip,
  onUnequip,
}: DecorationPreviewProps) {
  const { colors, isDark } = useTheme();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  if (!item) return null;

  const styleData = JSON.parse(item.styleData);

  // Determine which styles to apply based on category
  const bgStyle: DecorationStyleBackground | null =
    item.category === 'background' ? styleData : null;
  const frameStyle: DecorationStyleFrame | null =
    item.category === 'frame' ? styleData : null;
  const frameCornerConfig: CornerDecorationConfig | null = frameStyle?.cornerDecorations || null;
  const bgCornerConfig: CornerDecorationConfig | null = bgStyle?.cornerDecorations || null;
  const iconStyle: DecorationStyleIconColors | null =
    item.category === 'icon_color' ? styleData : null;

  // Default colors for non-decorated elements
  const textColor = bgStyle?.textColor || colors.text.primary;
  const captionColor = bgStyle?.captionColor || colors.text.secondary;

  // Action icon colors
  const likeColor = iconStyle?.likeColor || '#FF3B30';
  const commentColor = iconStyle?.commentColor || colors.text.primary;
  const shareColor = iconStyle?.shareColor || colors.text.primary;
  const giftColor = iconStyle?.giftColor || '#FBBF24';
  const saveColor = iconStyle?.saveColor || colors.text.primary;

  const renderMockPost = () => {
    const content = (
      <View
        style={[
          mockStyles.post,
          frameStyle && {
            borderWidth: frameStyle.borderWidth,
            borderColor: frameStyle.borderColor,
            borderRadius: frameStyle.borderRadius,
            ...(frameStyle.shadowColor
              ? {
                  shadowColor: frameStyle.shadowColor,
                  shadowOpacity: frameStyle.shadowOpacity,
                  shadowRadius: frameStyle.shadowRadius,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: (frameStyle.shadowRadius || 4) * 2,
                }
              : {}),
          },
        ]}
      >
        {/* Header */}
        <View style={mockStyles.header}>
          <View style={mockStyles.avatarPlaceholder} />
          <View style={mockStyles.headerInfo}>
            <Text style={[mockStyles.username, { color: textColor }]}>
              @sampleuser
            </Text>
            <Text style={[mockStyles.time, { color: captionColor }]}>
              2h ago
            </Text>
          </View>
        </View>

        {/* Caption */}
        <Text style={[mockStyles.caption, { color: textColor }]}>
          This is how your posts will look with this decoration!
        </Text>

        {/* Image placeholder */}
        <View
          style={[
            mockStyles.imagePlaceholder,
            { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' },
          ]}
        >
          <Ionicons name="image-outline" size={48} color="#9CA3AF" />
          {frameCornerConfig && <CornerDecorations config={frameCornerConfig} />}
        </View>

        {/* Actions */}
        <View style={mockStyles.actions}>
          <View style={mockStyles.leftActions}>
            <View style={mockStyles.actionBtn}>
              <Ionicons name="heart" size={24} color={likeColor} />
              <Text style={[mockStyles.actionCount, { color: textColor }]}>
                24
              </Text>
            </View>
            <View style={mockStyles.actionBtn}>
              <Ionicons
                name="chatbubble-outline"
                size={22}
                color={commentColor}
              />
              <Text style={[mockStyles.actionCount, { color: textColor }]}>
                8
              </Text>
            </View>
            <View style={mockStyles.actionBtn}>
              <Ionicons
                name="repeat-outline"
                size={22}
                color={shareColor}
              />
              <Text style={[mockStyles.actionCount, { color: textColor }]}>
                3
              </Text>
            </View>
            <View style={mockStyles.actionBtn}>
              <Ionicons name="gift" size={22} color={giftColor} />
            </View>
          </View>
          <Ionicons name="bookmark-outline" size={24} color={saveColor} />
        </View>
      </View>
    );

    // Wrap in gradient if background decoration with gradient type
    if (bgStyle && bgStyle.type === 'gradient' && bgStyle.colors) {
      return (
        <LinearGradient
          colors={bgStyle.colors as [string, string, ...string[]]}
          locations={bgStyle.locations as [number, number, ...number[]] | undefined}
          start={bgStyle.start || { x: 0, y: 0 }}
          end={bgStyle.end || { x: 1, y: 1 }}
          style={mockStyles.postBgWrapper}
        >
          {bgCornerConfig && <CornerDecorations config={bgCornerConfig} />}
          {content}
        </LinearGradient>
      );
    }

    // Wrap in solid background if background decoration with solid type
    if (bgStyle && bgStyle.type === 'solid' && bgStyle.color) {
      return (
        <View
          style={[mockStyles.postBgWrapper, { backgroundColor: bgStyle.color }]}
        >
          {bgCornerConfig && <CornerDecorations config={bgCornerConfig} />}
          {content}
        </View>
      );
    }

    // Default wrapper
    return (
      <View
        style={[
          mockStyles.postBgWrapper,
          { backgroundColor: colors.background },
        ]}
      >
        {content}
      </View>
    );
  };

  const canAfford = skyCoins >= item.priceSkyCoins;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.surface },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text
              style={[styles.title, { color: colors.text.primary }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {/* Spacer to balance the close button */}
            <View style={styles.closeBtn} />
          </View>

          {/* Preview */}
          <ScrollView
            contentContainerStyle={styles.previewContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderMockPost()}
          </ScrollView>

          {/* Action Button */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {!isOwned ? (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  !canAfford && styles.actionButtonDisabled,
                ]}
                onPress={() => onPurchase(item)}
                disabled={!canAfford}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    canAfford
                      ? [SKY_COIN_COLORS.dark, SKY_COIN_COLORS.deepDark]
                      : ['#9CA3AF', '#6B7280']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <View style={styles.actionButtonContent}>
                    <Text style={styles.actionButtonText}>
                      {canAfford
                        ? `Purchase for ${item.priceSkyCoins}`
                        : `Need ${item.priceSkyCoins - skyCoins} more`}
                    </Text>
                    <SkyCoinIcon size={14} variant="inline" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : isActive ? (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.unequipButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => onUnequip(item)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.unequipButtonText,
                    { color: colors.text.secondary },
                  ]}
                >
                  Unequip
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEquip(item)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionButtonText}>Equip</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    height: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  previewContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  unequipButton: {
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unequipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

const mockStyles = StyleSheet.create({
  postBgWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  post: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9CA3AF',
  },
  headerInfo: {
    marginLeft: 10,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  caption: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
});
