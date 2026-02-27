import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useTheme } from '../theme';
import { CornerPosition, CornerIconPurchase, CornerIconPlacement } from '../types/decorations';
import CornerIconPickerSheet from './CornerIconPickerSheet';

interface CornerIconsManagerProps {
  skyCoins: number;
  onPurchase?: () => void;
}

const POSITIONS: { key: CornerPosition; label: string }[] = [
  { key: 'top-left', label: 'Top Left' },
  { key: 'top-right', label: 'Top Right' },
  { key: 'bottom-left', label: 'Bottom Left' },
  { key: 'bottom-right', label: 'Bottom Right' },
];

export default function CornerIconsManager({ skyCoins, onPurchase }: CornerIconsManagerProps) {
  const { colors, isDark } = useTheme();

  const [purchases, setPurchases] = useState<CornerIconPurchase[]>([]);
  const [placements, setPlacements] = useState<CornerIconPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerPosition, setPickerPosition] = useState<CornerPosition | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getMyCornerIcons();
      setPurchases(data.purchases || []);
      setPlacements(data.placements || []);
    } catch (error) {
      console.error('Error loading corner icons:', error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const getPlacement = (position: CornerPosition): CornerIconPlacement | undefined =>
    placements.find((p) => p.position === position);

  const handlePurchaseAndPlace = async (iconFamily: string, iconName: string, color: string) => {
    // First purchase
    await api.purchaseCornerIcon(iconFamily, iconName);
    // Then place
    await api.placeCornerIcon(pickerPosition!, iconFamily, iconName, color);
    await loadData();
    onPurchase?.();
  };

  const handlePlace = async (iconFamily: string, iconName: string, color: string) => {
    await api.placeCornerIcon(pickerPosition!, iconFamily, iconName, color);
    await loadData();
  };

  const handleUpdateColor = async (color: string) => {
    await api.updateCornerIconColor(pickerPosition!, color);
    await loadData();
  };

  const handleRemove = async () => {
    await api.removeCornerIcon(pickerPosition!);
    await loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text.secondary} />
      </View>
    );
  }

  const currentPlacement = pickerPosition ? getPlacement(pickerPosition) : null;

  return (
    <View style={styles.container}>
      {/* Mini post preview */}
      <View style={[styles.previewCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
        <View style={styles.previewInner}>
          {/* Preview corners */}
          {placements.map((p) => {
            const posStyle = PREVIEW_POS[p.position];
            if (!posStyle) return null;
            const IconComp = p.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
            return (
              <View key={p.position} style={[styles.previewCorner, posStyle]}>
                <IconComp name={p.iconName as any} size={14} color={p.color} />
              </View>
            );
          })}
          <View style={styles.previewContent}>
            <View style={[styles.previewLine, { backgroundColor: colors.border, width: '60%' }]} />
            <View style={[styles.previewLine, { backgroundColor: colors.border, width: '80%' }]} />
            <View style={[styles.previewBox, { backgroundColor: colors.border }]} />
          </View>
        </View>
        <Text style={[styles.previewLabel, { color: colors.text.secondary }]}>
          Preview
        </Text>
      </View>

      {/* 2x2 Corner Grid */}
      <View style={styles.grid}>
        {POSITIONS.map((pos) => {
          const placement = getPlacement(pos.key);
          const IconComp = placement
            ? placement.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons
            : null;

          return (
            <TouchableOpacity
              key={pos.key}
              style={[
                styles.cornerBlock,
                {
                  backgroundColor: colors.background,
                  borderColor: placement ? '#3B82F6' : colors.border,
                  borderWidth: placement ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => setPickerPosition(pos.key)}
            >
              {placement && IconComp ? (
                <View style={styles.cornerBlockInner}>
                  <IconComp name={placement.iconName as any} size={28} color={placement.color} />
                  <Text style={[styles.cornerBlockLabel, { color: colors.text.secondary }]} numberOfLines={1}>
                    {placement.iconName}
                  </Text>
                </View>
              ) : (
                <View style={styles.cornerBlockInner}>
                  <View style={[styles.plusCircle, { borderColor: colors.border }]}>
                    <Ionicons name="add" size={20} color={colors.text.secondary} />
                  </View>
                  <Text style={[styles.cornerBlockLabel, { color: colors.text.secondary }]}>
                    {pos.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <Text style={[styles.statsText, { color: colors.text.secondary }]}>
          {purchases.length} icon{purchases.length !== 1 ? 's' : ''} owned
        </Text>
        <Text style={[styles.statsText, { color: colors.text.secondary }]}>
          {placements.length}/4 corners placed
        </Text>
      </View>

      {/* Picker Sheet */}
      {pickerPosition && (
        <CornerIconPickerSheet
          visible={!!pickerPosition}
          position={pickerPosition}
          currentIcon={
            currentPlacement
              ? { iconFamily: currentPlacement.iconFamily, iconName: currentPlacement.iconName, color: currentPlacement.color }
              : null
          }
          ownedIcons={purchases}
          skyCoins={skyCoins}
          onPurchaseAndPlace={handlePurchaseAndPlace}
          onPlace={handlePlace}
          onUpdateColor={handleUpdateColor}
          onRemove={handleRemove}
          onClose={() => setPickerPosition(null)}
        />
      )}
    </View>
  );
}

const PREVIEW_POS: Record<string, { top?: number; bottom?: number; left?: number; right?: number; position: 'absolute' }> = {
  'top-left': { position: 'absolute', top: 6, left: 6 },
  'top-right': { position: 'absolute', top: 6, right: 6 },
  'bottom-left': { position: 'absolute', bottom: 6, left: 6 },
  'bottom-right': { position: 'absolute', bottom: 6, right: 6 },
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
    alignItems: 'center',
  },
  previewInner: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewCorner: {
    zIndex: 2,
  },
  previewContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 30,
  },
  previewLine: {
    height: 6,
    borderRadius: 3,
  },
  previewBox: {
    width: '70%',
    height: 40,
    borderRadius: 8,
    marginTop: 4,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cornerBlock: {
    width: '48%',
    flexGrow: 1,
    aspectRatio: 1.3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cornerBlockInner: {
    alignItems: 'center',
    gap: 8,
  },
  cornerBlockLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
