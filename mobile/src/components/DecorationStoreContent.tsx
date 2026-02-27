import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SkyCoinIcon, { SKY_COIN_COLORS } from './coins/SkyCoinIcon';
import { api } from '../services/api';
import { useTheme } from '../theme';
import {
  StoreDecoration,
  UserOwnedDecoration,
  ActiveDecorationConfig,
} from '../types/decorations';
import CornerIconsManager from './CornerIconsManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

interface DecorationStoreContentProps {
  skyCoins: number;
  onPurchase?: () => void;
}

type Category = 'background' | 'frame' | 'icon_color' | 'corners';

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'background', label: 'Backgrounds', icon: 'image-outline' },
  { key: 'frame', label: 'Frames', icon: 'square-outline' },
  { key: 'icon_color', label: 'Icons', icon: 'color-palette-outline' },
  { key: 'corners', label: 'Corners', icon: 'grid-outline' },
];

export default function DecorationStoreContent({ skyCoins, onPurchase }: DecorationStoreContentProps) {
  const { colors, isDark } = useTheme();

  const [activeCategory, setActiveCategory] = useState<Category>('background');
  const [themeFilter, setThemeFilter] = useState<'light' | 'dark'>('light');
  const [storeItems, setStoreItems] = useState<StoreDecoration[]>([]);
  const [ownedDecorations, setOwnedDecorations] = useState<UserOwnedDecoration[]>([]);
  const [activeConfig, setActiveConfig] = useState<ActiveDecorationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ---- Data loading ----

  const loadStoreItems = useCallback(async () => {
    if (activeCategory === 'corners') return; // Corners tab has its own data loading
    try {
      const response = await api.getDecorationStore(activeCategory);
      setStoreItems(response.items || []);
    } catch (error) {
      console.error('Error loading store items:', error);
    }
  }, [activeCategory]);

  const loadOwnedDecorations = useCallback(async () => {
    try {
      const response = await api.getMyDecorations();
      setOwnedDecorations(response.decorations || []);
    } catch (error) {
      console.error('Error loading owned decorations:', error);
    }
  }, []);

  const loadActiveConfig = useCallback(async () => {
    try {
      const response = await api.getMyActiveDecoration();
      setActiveConfig(response.activeDecoration || null);
    } catch (error) {
      console.error('Error loading active config:', error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStoreItems(), loadOwnedDecorations(), loadActiveConfig()]);
    setLoading(false);
  }, [loadStoreItems, loadOwnedDecorations, loadActiveConfig]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStoreItems(), loadOwnedDecorations(), loadActiveConfig()]);
    setRefreshing(false);
  }, [loadStoreItems, loadOwnedDecorations, loadActiveConfig]);

  // ---- Helpers ----

  const isOwned = (itemId: string) => ownedDecorations.some((d) => d.decorationId === itemId);

  const isActive = (item: StoreDecoration) => {
    if (!activeConfig) return false;
    if (item.category === 'background') {
      return item.themeMode === 'light'
        ? activeConfig.lightBackgroundId === item.id
        : activeConfig.darkBackgroundId === item.id;
    }
    if (item.category === 'frame') return activeConfig.frameId === item.id;
    if (item.category === 'icon_color') return activeConfig.iconColorId === item.id;
    return false;
  };

  // ---- Handlers ----

  const handlePurchase = async (item: StoreDecoration) => {
    if (skyCoins < item.priceSkyCoins) {
      Alert.alert('Not Enough Sky Coins', `You need ${item.priceSkyCoins} Sky Coins but only have ${skyCoins}.`);
      return;
    }
    Alert.alert(
      'Purchase Decoration',
      `Buy "${item.name}" for ${item.priceSkyCoins} Sky Coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            try {
              await api.purchaseDecoration(item.id);
              Alert.alert('Success', `Purchased ${item.name}!`);
              await Promise.all([loadOwnedDecorations(), loadStoreItems()]);
              onPurchase?.();
            } catch (error: any) {
              const msg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Failed to purchase decoration';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const handleEquip = async (item: StoreDecoration) => {
    try {
      const config: any = {};
      if (item.category === 'background') {
        if (item.themeMode === 'light') config.lightBackgroundId = item.id;
        else config.darkBackgroundId = item.id;
      } else if (item.category === 'frame') {
        config.frameId = item.id;
      } else if (item.category === 'icon_color') {
        config.iconColorId = item.id;
      }
      await api.setActiveDecoration(config);
      await loadActiveConfig();
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to equip decoration';
      Alert.alert('Error', msg);
    }
  };

  const handleUnequip = async (item: StoreDecoration) => {
    try {
      const config: any = {};
      if (item.category === 'background') {
        if (item.themeMode === 'light') config.lightBackgroundId = null;
        else config.darkBackgroundId = null;
      } else if (item.category === 'frame') {
        config.frameId = null;
      } else if (item.category === 'icon_color') {
        config.iconColorId = null;
      }
      await api.setActiveDecoration(config);
      await loadActiveConfig();
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to unequip decoration';
      Alert.alert('Error', msg);
    }
  };

  const handleCardPress = (item: StoreDecoration) => {
    const owned = isOwned(item.id);
    const active = isActive(item);

    if (!owned) {
      handlePurchase(item);
    } else if (active) {
      Alert.alert('Unequip', `Remove "${item.name}" from your profile?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unequip', style: 'destructive', onPress: () => handleUnequip(item) },
      ]);
    } else {
      handleEquip(item);
    }
  };

  // ---- Preview renderers ----

  const renderBackgroundPreview = (item: StoreDecoration) => {
    try {
      const style = JSON.parse(item.styleData);
      const corner = style.cornerDecorations;
      const binder = style.binderIcon;
      if (style.type === 'gradient' && style.colors) {
        return (
          <View style={previewStyles.bgPreviewContainer}>
            <LinearGradient
              colors={style.colors}
              locations={style.locations}
              start={style.start || { x: 0, y: 0 }}
              end={style.end || { x: 1, y: 1 }}
              style={previewStyles.bgPreview}
            />
            {binder && (
              <View style={previewStyles.binderIndicator}>
                <LinearGradient
                  colors={style.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={previewStyles.binderStrip}
                >
                  <MaterialCommunityIcons name={binder.iconName} size={8} color={binder.color} />
                  <MaterialCommunityIcons name={binder.iconName} size={8} color={binder.color} />
                </LinearGradient>
              </View>
            )}
            {corner && (
              <View style={previewStyles.bgCornerIndicator}>
                <MaterialCommunityIcons name={corner.iconName} size={12} color={corner.color} />
              </View>
            )}
          </View>
        );
      }
      return <View style={[previewStyles.bgPreview, { backgroundColor: style.color || '#E5E7EB' }]} />;
    } catch {
      return <View style={[previewStyles.bgPreview, { backgroundColor: '#E5E7EB' }]} />;
    }
  };

  const renderFramePreview = (item: StoreDecoration) => {
    try {
      const style = JSON.parse(item.styleData);
      return (
        <View style={previewStyles.framePreviewContainer}>
          <View
            style={[
              previewStyles.framePreview,
              {
                borderWidth: style.borderWidth || 2,
                borderColor: style.borderColor || colors.border,
                borderRadius: style.borderRadius || 8,
              },
            ]}
          />
        </View>
      );
    } catch {
      return <View style={[previewStyles.framePreview, { borderWidth: 2, borderColor: colors.border, borderRadius: 8 }]} />;
    }
  };

  const renderIconPreview = (item: StoreDecoration) => {
    try {
      const style = JSON.parse(item.styleData);
      const colorKeys = ['likeColor', 'commentColor', 'shareColor', 'saveColor', 'giftColor'];
      return (
        <View style={previewStyles.iconRow}>
          {colorKeys.map((k) => (
            <View key={k} style={[previewStyles.iconDot, { backgroundColor: style[k] || '#9CA3AF' }]} />
          ))}
        </View>
      );
    } catch {
      return (
        <View style={previewStyles.iconRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={[previewStyles.iconDot, { backgroundColor: '#9CA3AF' }]} />
          ))}
        </View>
      );
    }
  };

  const renderItemPreview = (item: StoreDecoration) => {
    if (item.category === 'background') return renderBackgroundPreview(item);
    if (item.category === 'frame') return renderFramePreview(item);
    if (item.category === 'icon_color') return renderIconPreview(item);
    return null;
  };

  // ---- Filtered items ----

  const filteredItems =
    (activeCategory === 'background' || activeCategory === 'icon_color')
      ? storeItems.filter((item) => item.themeMode === themeFilter || item.themeMode === 'any')
      : storeItems;

  // ---- Active decoration summary ----

  const renderActiveSummary = () => {
    if (!activeConfig) return null;
    const parts: string[] = [];
    if (activeConfig.lightBackground) parts.push(activeConfig.lightBackground.name);
    if (activeConfig.darkBackground) parts.push(activeConfig.darkBackground.name);
    if (activeConfig.frame) parts.push(activeConfig.frame.name);
    if (activeConfig.iconColor) parts.push(activeConfig.iconColor.name);

    if (parts.length === 0) return null;

    return (
      <View style={[styles.activeSummary, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
        <Ionicons name="sparkles" size={14} color="#F59E0B" />
        <Text style={[styles.activeSummaryText, { color: colors.text.secondary }]} numberOfLines={1}>
          Active: {parts.join(', ')}
        </Text>
      </View>
    );
  };

  // ---- Card renderer ----

  const renderCard = ({ item }: { item: StoreDecoration }) => {
    const owned = isOwned(item.id);
    const active = isActive(item);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.background,
            borderColor: active ? '#F59E0B' : colors.border,
            borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}
        activeOpacity={0.7}
        onPress={() => handleCardPress(item)}
      >
        {/* Preview area */}
        <View style={[styles.cardPreview, { backgroundColor: colors.surfaceVariant }]}>
          {renderItemPreview(item)}
          {active && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#F59E0B" />
            </View>
          )}
        </View>

        {/* Info area */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>

          {owned ? (
            <View style={[styles.ownedBadge, {
              backgroundColor: active
                ? (isDark ? 'rgba(217,119,6,0.15)' : '#FEF3C7')
                : (isDark ? 'rgba(5,150,105,0.15)' : '#ECFDF5')
            }]}>
              <Text style={[styles.ownedBadgeText, { color: active ? '#F59E0B' : '#10B981' }]}>
                {active ? 'Active' : 'Owned'}
              </Text>
            </View>
          ) : (
            <View style={[styles.priceBadge, {
              backgroundColor: isDark ? `${SKY_COIN_COLORS.primary}1F` : '#EFF6FF'
            }]}>
              <SkyCoinIcon size={11} variant="inline" />
              <Text style={[styles.priceText, { color: isDark ? SKY_COIN_COLORS.mid : SKY_COIN_COLORS.deepDark }]}>
                {item.priceSkyCoins}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ---- Main render ----

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Sky Coins Balance Bar */}
      <View style={[styles.balanceBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <SkyCoinIcon size={16} variant="inline" />
        <Text style={[styles.balanceAmount, { color: colors.text.primary }]}>
          {skyCoins.toLocaleString()}
        </Text>
        <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>Sky Coins</Text>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => {
          const selected = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: selected ? colors.background : colors.surfaceVariant,
                  borderColor: selected ? colors.border : 'transparent',
                },
                selected && styles.categoryPillActive,
              ]}
              activeOpacity={0.7}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Ionicons
                name={cat.icon}
                size={14}
                color={selected ? colors.text.primary : colors.text.secondary}
              />
              <Text
                style={[
                  styles.categoryPillText,
                  { color: selected ? colors.text.primary : colors.text.secondary },
                  selected && styles.categoryPillTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Theme toggle for backgrounds and icons */}
      {(activeCategory === 'background' || activeCategory === 'icon_color') && (
        <View style={styles.themeToggleRow}>
          {(['light', 'dark'] as const).map((mode) => {
            const selected = themeFilter === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.themeToggle,
                  {
                    backgroundColor: selected ? colors.background : 'transparent',
                    borderColor: selected ? colors.border : 'transparent',
                  },
                  selected && styles.themeToggleActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setThemeFilter(mode)}
              >
                <Ionicons
                  name={mode === 'light' ? 'sunny-outline' : 'moon-outline'}
                  size={12}
                  color={selected ? colors.text.primary : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.themeToggleText,
                    { color: selected ? colors.text.primary : colors.text.secondary },
                    selected && styles.themeToggleTextActive,
                  ]}
                >
                  {mode === 'light' ? 'Light' : 'Dark'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Items Grid or Corners Manager */}
      {activeCategory === 'corners' ? (
        <CornerIconsManager skyCoins={skyCoins} onPurchase={onPurchase} />
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.secondary} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            No decorations available yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text.secondary} />
          }
          ListFooterComponent={renderActiveSummary}
        />
      )}
    </View>
  );
}

// ---- Preview sub-styles ----

const previewStyles = StyleSheet.create({
  bgPreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  bgPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  bgCornerIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    opacity: 0.7,
  },
  binderIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
  },
  binderStrip: {
    width: 10,
    height: '100%',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 2,
  },
  framePreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  framePreview: {
    width: 50,
    height: 50,
    alignSelf: 'center',
  },
  cornerIndicator: {
    marginTop: 4,
    opacity: 0.8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});

// ---- Main styles ----

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Balance bar
  balanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  // balanceCloud removed — now uses <SkyCoinIcon variant="inline" />
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Category pills
  categoryRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  categoryPillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    fontWeight: '700',
  },

  // Theme toggle
  themeToggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 6,
    alignSelf: 'flex-start',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  themeToggleActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  themeToggleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  themeToggleTextActive: {
    fontWeight: '700',
  },

  // Grid
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridContent: {
    paddingBottom: 20,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    marginBottom: CARD_GAP,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPreview: {
    width: '100%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    overflow: 'hidden',
  },
  cardInfo: {
    padding: 10,
    gap: 6,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 2,
  },

  // Owned badge
  ownedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ownedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Price badge
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  // priceCloud removed — now uses <SkyCoinIcon variant="inline" />
  priceText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Loading / Empty
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Active summary
  activeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  activeSummaryText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
