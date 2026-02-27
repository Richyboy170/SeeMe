import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { CornerPosition, CornerIconPurchase } from '../types/decorations';
import SkyCoinIcon, { SKY_COIN_COLORS } from './coins/SkyCoinIcon';

// Curated popular icon names from MaterialCommunityIcons
const MATERIAL_ICONS: string[] = [
  'star', 'star-outline', 'heart', 'heart-outline', 'diamond', 'diamond-stone',
  'crown', 'crown-outline', 'flower', 'flower-tulip', 'flower-poppy',
  'leaf', 'leaf-maple', 'clover', 'tree', 'pine-tree',
  'fire', 'flash', 'lightning-bolt', 'snowflake', 'weather-sunny',
  'moon-waning-crescent', 'cloud', 'shimmer', 'water', 'wave',
  'butterfly', 'bee', 'ladybug', 'fish', 'dolphin', 'cat', 'dog', 'paw',
  'music-note', 'music', 'palette', 'brush', 'pencil',
  'camera', 'image', 'movie', 'gamepad-variant',
  'rocket', 'airplane', 'car-sports', 'sail-boat',
  'shield', 'shield-star', 'sword', 'chess-queen', 'trophy',
  'gift', 'party-popper', 'balloon', 'cake-variant', 'cupcake',
  'coffee', 'food-apple', 'fruit-cherries', 'pizza',
  'emoticon-happy', 'emoticon-cool', 'ghost', 'alien', 'robot',
  'bell', 'bookmark', 'flag', 'map-marker', 'compass',
  'eye', 'eye-outline', 'hand-peace-variant', 'thumb-up',
  'circle', 'circle-outline', 'square', 'triangle', 'hexagon',
  'infinity', 'atom', 'dna', 'molecule',
  'meditation', 'yoga', 'run', 'bike',
  'earth', 'globe-model', 'terrain',
  'lightbulb', 'lightbulb-on', 'candle',
  'seed', 'sprout', 'cactus', 'mushroom',
  'sun-wireless', 'flare', 'creation', 'auto-fix',
  'cards-heart', 'cards-diamond', 'cards-spade', 'cards-club',
  'zodiac-aries', 'zodiac-leo', 'zodiac-pisces',
  'feather', 'star-four-points', 'horseshoe', 'clover',
];

// Curated popular icon names from Ionicons
const IONICON_ICONS: string[] = [
  'star', 'star-outline', 'heart', 'heart-outline',
  'diamond', 'diamond-outline', 'flower', 'flower-outline',
  'leaf', 'leaf-outline', 'rose', 'rose-outline',
  'flame', 'flame-outline', 'flash', 'flash-outline',
  'sunny', 'sunny-outline', 'moon', 'moon-outline',
  'cloud', 'cloud-outline', 'rainy', 'rainy-outline', 'snow', 'snow-outline',
  'fish', 'fish-outline', 'paw', 'paw-outline',
  'musical-note', 'musical-notes', 'color-palette', 'color-palette-outline',
  'camera', 'camera-outline', 'film', 'film-outline',
  'rocket', 'rocket-outline', 'airplane', 'airplane-outline',
  'shield', 'shield-outline', 'trophy', 'trophy-outline',
  'gift', 'gift-outline', 'ribbon', 'ribbon-outline',
  'cafe', 'cafe-outline', 'pizza', 'pizza-outline', 'ice-cream', 'ice-cream-outline',
  'happy', 'happy-outline', 'skull', 'skull-outline',
  'flag', 'flag-outline', 'bookmark', 'bookmark-outline',
  'eye', 'eye-outline', 'hand-left', 'hand-left-outline', 'thumbs-up', 'thumbs-up-outline',
  'triangle', 'triangle-outline', 'square', 'square-outline', 'ellipse', 'ellipse-outline',
  'planet', 'planet-outline', 'earth', 'earth-outline',
  'bulb', 'bulb-outline', 'sparkles', 'sparkles-outline',
  'fitness', 'fitness-outline', 'bicycle', 'bicycle-outline',
  'baseball', 'baseball-outline', 'basketball', 'basketball-outline', 'football', 'football-outline',
];

const PRESET_COLORS = [
  '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#30D5C8', '#007AFF', '#5856D6',
  '#AF52DE', '#FF2D55', '#A2845E', '#8E8E93',
  '#000000', '#FFD700', '#C0C0C0', '#E5E7EB',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 6;
const ICON_CELL_SIZE = Math.floor((SCREEN_WIDTH - 64) / NUM_COLUMNS);

type IconFamily = 'MaterialCommunityIcons' | 'Ionicons';

interface CornerIconPickerSheetProps {
  visible: boolean;
  position: CornerPosition;
  currentIcon?: { iconFamily: string; iconName: string; color: string } | null;
  ownedIcons: CornerIconPurchase[];
  skyCoins: number;
  onPurchaseAndPlace: (iconFamily: string, iconName: string, color: string) => Promise<void>;
  onPlace: (iconFamily: string, iconName: string, color: string) => Promise<void>;
  onUpdateColor: (color: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

const POSITION_LABELS: Record<CornerPosition, string> = {
  'top-left': 'Top Left',
  'top-right': 'Top Right',
  'bottom-left': 'Bottom Left',
  'bottom-right': 'Bottom Right',
};

export default function CornerIconPickerSheet({
  visible,
  position,
  currentIcon,
  ownedIcons,
  skyCoins,
  onPurchaseAndPlace,
  onPlace,
  onUpdateColor,
  onRemove,
  onClose,
}: CornerIconPickerSheetProps) {
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFamily, setActiveFamily] = useState<IconFamily>('MaterialCommunityIcons');
  const [selectedIcon, setSelectedIcon] = useState<{ family: IconFamily; name: string } | null>(
    currentIcon ? { family: currentIcon.iconFamily as IconFamily, name: currentIcon.iconName } : null
  );
  const [selectedColor, setSelectedColor] = useState(currentIcon?.color || '#FFFFFF');
  const [loading, setLoading] = useState(false);

  const isOwned = useCallback(
    (family: string, name: string) =>
      ownedIcons.some((p) => p.iconFamily === family && p.iconName === name),
    [ownedIcons]
  );

  const iconList = useMemo(() => {
    const list = activeFamily === 'MaterialCommunityIcons' ? MATERIAL_ICONS : IONICON_ICONS;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((name) => name.toLowerCase().includes(q));
  }, [activeFamily, searchQuery]);

  const handleAction = async () => {
    if (!selectedIcon) return;
    setLoading(true);
    try {
      const owned = isOwned(selectedIcon.family, selectedIcon.name);

      // If it's the same icon already placed, just update color
      if (
        currentIcon &&
        currentIcon.iconFamily === selectedIcon.family &&
        currentIcon.iconName === selectedIcon.name
      ) {
        if (selectedColor !== currentIcon.color) {
          await onUpdateColor(selectedColor);
        }
      } else if (owned) {
        await onPlace(selectedIcon.family, selectedIcon.name, selectedColor);
      } else {
        await onPurchaseAndPlace(selectedIcon.family, selectedIcon.name, selectedColor);
      }
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Action failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentIcon) return;
    setLoading(true);
    try {
      await onRemove();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove');
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = () => {
    if (!selectedIcon) return 'Select an icon';
    if (
      currentIcon &&
      currentIcon.iconFamily === selectedIcon.family &&
      currentIcon.iconName === selectedIcon.name
    ) {
      return selectedColor !== currentIcon.color ? 'Update Color' : 'No Changes';
    }
    if (isOwned(selectedIcon.family, selectedIcon.name)) {
      return 'Place';
    }
    return `Buy & Place (5 Sky Coins)`;
  };

  const actionDisabled =
    !selectedIcon ||
    loading ||
    (currentIcon &&
      currentIcon.iconFamily === selectedIcon?.family &&
      currentIcon.iconName === selectedIcon?.name &&
      selectedColor === currentIcon.color);

  const renderIconCell = useCallback(
    ({ item }: { item: string }) => {
      const isSelected = selectedIcon?.family === activeFamily && selectedIcon?.name === item;
      const owned = isOwned(activeFamily, item);
      const IconComp = activeFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

      return (
        <TouchableOpacity
          style={[
            styles.iconCell,
            {
              backgroundColor: isSelected
                ? isDark ? 'rgba(59,130,246,0.25)' : '#DBEAFE'
                : isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
              borderColor: isSelected ? '#3B82F6' : 'transparent',
            },
          ]}
          activeOpacity={0.7}
          onPress={() => setSelectedIcon({ family: activeFamily, name: item })}
        >
          <IconComp name={item as any} size={24} color={isSelected ? selectedColor : (isDark ? '#D1D5DB' : '#6B7280')} />
          {owned && (
            <View style={styles.ownedDot}>
              <Ionicons name="checkmark-circle" size={10} color="#10B981" />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [activeFamily, selectedIcon, selectedColor, isDark, isOwned]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ICON_CELL_SIZE,
      offset: ICON_CELL_SIZE * Math.floor(index / NUM_COLUMNS),
      index,
    }),
    []
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {POSITION_LABELS[position]} Corner
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.text.secondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder="Search icons..."
              placeholderTextColor={colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Family Tabs */}
          <View style={styles.familyRow}>
            {(['MaterialCommunityIcons', 'Ionicons'] as const).map((fam) => {
              const sel = activeFamily === fam;
              return (
                <TouchableOpacity
                  key={fam}
                  style={[
                    styles.familyTab,
                    {
                      backgroundColor: sel ? colors.background : colors.surfaceVariant,
                      borderColor: sel ? colors.border : 'transparent',
                    },
                    sel && styles.familyTabActive,
                  ]}
                  onPress={() => setActiveFamily(fam)}
                >
                  <Text style={[styles.familyTabText, { color: sel ? colors.text.primary : colors.text.secondary }, sel && styles.familyTabTextActive]}>
                    {fam === 'MaterialCommunityIcons' ? 'Material' : 'Ionicons'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Icon Grid */}
          <FlatList
            data={iconList}
            renderItem={renderIconCell}
            keyExtractor={(item) => `${activeFamily}-${item}`}
            numColumns={NUM_COLUMNS}
            getItemLayout={getItemLayout}
            style={styles.iconGrid}
            contentContainerStyle={styles.iconGridContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptySearch}>
                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No icons found</Text>
              </View>
            }
          />

          {/* Color Swatches */}
          <View style={styles.colorSection}>
            <Text style={[styles.colorLabel, { color: colors.text.secondary }]}>Color</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {currentIcon && (
              <TouchableOpacity
                style={[styles.removeBtn, { borderColor: '#EF4444' }]}
                onPress={handleRemove}
                disabled={loading}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: actionDisabled ? colors.border : '#3B82F6', flex: 1 },
              ]}
              onPress={handleAction}
              disabled={!!actionDisabled}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={styles.actionBtnContent}>
                  {!isOwned(selectedIcon?.family || '', selectedIcon?.name || '') && selectedIcon && !(
                    currentIcon &&
                    currentIcon.iconFamily === selectedIcon.family &&
                    currentIcon.iconName === selectedIcon.name
                  ) && (
                    <SkyCoinIcon size={14} variant="inline" />
                  )}
                  <Text style={styles.actionBtnText}>{getActionLabel()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  familyRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  familyTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  familyTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  familyTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  familyTabTextActive: {
    fontWeight: '700',
  },
  iconGrid: {
    flexGrow: 0,
    maxHeight: 240,
    marginHorizontal: 16,
  },
  iconGridContent: {
    paddingBottom: 4,
  },
  iconCell: {
    width: ICON_CELL_SIZE,
    height: ICON_CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  ownedDot: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  emptySearch: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  colorSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: '#3B82F6',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  removeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
