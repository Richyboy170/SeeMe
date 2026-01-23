/**
 * Pose Selector Component
 * Phase 3.1: Full-Body 3D Avatar System
 *
 * Allows users to select from preset poses for their 3D avatar.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  PRESET_POSES,
  PresetPose,
  getCategories,
  getPosesByCategory,
} from '../data/presetPoses';

interface PoseSelectorProps {
  currentPoseId: string;
  onSelectPose: (pose: PresetPose) => void;
  compact?: boolean;
}

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 64) / 4; // 4 cards per row with padding

export const PoseSelector: React.FC<PoseSelectorProps> = ({
  currentPoseId,
  onSelectPose,
  compact = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = getCategories();

  const filteredPoses =
    selectedCategory === 'all'
      ? PRESET_POSES
      : getPosesByCategory(selectedCategory as PresetPose['category']);

  return (
    <View style={styles.container}>
      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.tab,
              selectedCategory === cat.id && styles.tabActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text
              style={[
                styles.tabText,
                selectedCategory === cat.id && styles.tabTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pose grid */}
      <ScrollView
        style={styles.gridContainer}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filteredPoses.map((pose) => (
            <TouchableOpacity
              key={pose.id}
              style={[
                styles.poseCard,
                compact && styles.poseCardCompact,
                currentPoseId === pose.id && styles.poseSelected,
              ]}
              onPress={() => onSelectPose(pose)}
              activeOpacity={0.7}
            >
              <Text style={styles.poseIcon}>{pose.icon}</Text>
              <Text
                style={[styles.poseName, compact && styles.poseNameCompact]}
                numberOfLines={1}
              >
                {pose.name}
              </Text>
              {!compact && (
                <Text style={styles.poseCategory}>{pose.category}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * Compact pose selector for inline use
 */
export const PoseSelectorInline: React.FC<{
  currentPoseId: string;
  onSelectPose: (pose: PresetPose) => void;
}> = ({ currentPoseId, onSelectPose }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.inlineContainer}
    >
      {PRESET_POSES.map((pose) => (
        <TouchableOpacity
          key={pose.id}
          style={[
            styles.inlineCard,
            currentPoseId === pose.id && styles.inlineCardSelected,
          ]}
          onPress={() => onSelectPose(pose)}
          activeOpacity={0.7}
        >
          <Text style={styles.inlineIcon}>{pose.icon}</Text>
          <Text style={styles.inlineName} numberOfLines={1}>
            {pose.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A4A',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFF',
  },
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    padding: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  poseCard: {
    width: CARD_SIZE,
    height: CARD_SIZE + 20,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  poseCardCompact: {
    height: CARD_SIZE,
  },
  poseSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#252545',
  },
  poseIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  poseName: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  poseNameCompact: {
    fontSize: 10,
  },
  poseCategory: {
    color: '#666',
    fontSize: 9,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  // Inline styles
  inlineContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    flexDirection: 'row',
  },
  inlineCard: {
    width: 70,
    height: 80,
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inlineCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#252545',
  },
  inlineIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  inlineName: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default PoseSelector;
