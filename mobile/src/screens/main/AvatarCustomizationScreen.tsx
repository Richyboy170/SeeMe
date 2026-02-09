import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { api } from '../../services/api';
import AvatarRenderer, { AvatarCustomizations } from '../../components/AvatarRenderer';
import { useTheme } from '../../theme';

// Types
type AvatarStyle = 'cartoon' | 'anime' | 'minimalist';

type RouteParams = {
  AvatarCustomization: {
    avatarId?: string;
  };
};

// Preset options
const SKIN_TONES = [
  { color: '#FFDBAC', name: 'Light' },
  { color: '#F1C27D', name: 'Medium Light' },
  { color: '#E0AC69', name: 'Medium' },
  { color: '#C68642', name: 'Medium Dark' },
  { color: '#8D5524', name: 'Dark' },
  { color: '#5C3A21', name: 'Deep' },
];

const HAIR_COLORS = [
  { color: '#000000', name: 'Black' },
  { color: '#4A3728', name: 'Brown' },
  { color: '#D4A574', name: 'Blonde' },
  { color: '#8B4513', name: 'Auburn' },
  { color: '#808080', name: 'Gray' },
  { color: '#FF6B6B', name: 'Red' },
  { color: '#9B59B6', name: 'Purple' },
  { color: '#3498DB', name: 'Blue' },
];

const EYE_COLORS = [
  { color: '#8B4513', name: 'Brown' },
  { color: '#2E86AB', name: 'Blue' },
  { color: '#228B22', name: 'Green' },
  { color: '#808080', name: 'Gray' },
  { color: '#DEB887', name: 'Hazel' },
  { color: '#000000', name: 'Black' },
];

const HAIR_STYLES = [
  { id: 'short', name: 'Short' },
  { id: 'medium', name: 'Medium' },
  { id: 'long', name: 'Long' },
  { id: 'curly', name: 'Curly' },
  { id: 'wavy', name: 'Wavy' },
  { id: 'bald', name: 'Bald' },
  { id: 'ponytail', name: 'Ponytail' },
  { id: 'bun', name: 'Bun' },
];

const GLASSES_OPTIONS = [
  { id: null, name: 'None' },
  { id: 'round', name: 'Round' },
  { id: 'square', name: 'Square' },
  { id: 'cat-eye', name: 'Cat-eye' },
  { id: 'aviator', name: 'Aviator' },
];

const HAT_OPTIONS = [
  { id: null, name: 'None' },
  { id: 'cap', name: 'Cap' },
  { id: 'beanie', name: 'Beanie' },
  { id: 'fedora', name: 'Fedora' },
  { id: 'headband', name: 'Headband' },
];

const EARRING_OPTIONS = [
  { id: null, name: 'None' },
  { id: 'studs', name: 'Studs' },
  { id: 'hoops', name: 'Hoops' },
  { id: 'dangles', name: 'Dangles' },
];

export default function AvatarCustomizationScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AvatarCustomization'>>();
  const editingAvatarId = route.params?.avatarId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('My Avatar');
  const [style, setStyle] = useState<AvatarStyle>('cartoon');
  const [customizations, setCustomizations] = useState<AvatarCustomizations>({
    skinTone: '#FFDBAC',
    eyeColor: '#8B4513',
    eyeSize: 1.0,
    hairColor: '#000000',
    hairStyle: 'short',
    accessories: {
      glasses: null,
      hat: null,
      earrings: null,
    },
  });

  useEffect(() => {
    if (editingAvatarId) {
      loadAvatar();
    }
  }, [editingAvatarId]);

  const loadAvatar = async () => {
    setLoading(true);
    try {
      const response = await api.getAvatar(editingAvatarId!);
      const avatar = response.avatar;
      setName(avatar.name);
      setStyle(avatar.style);
      setCustomizations(avatar.customizations);
    } catch (error) {
      Alert.alert('Error', 'Failed to load avatar');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your avatar');
      return;
    }

    setSaving(true);
    try {
      if (editingAvatarId) {
        await api.updateAvatar(editingAvatarId, {
          name: name.trim(),
          style,
          customizations,
        });
        Alert.alert('Success', 'Avatar updated successfully');
      } else {
        const response = await api.createAvatar({
          name: name.trim(),
          style,
          customizations,
        });
        // Automatically activate the new avatar
        if (response.avatar?.id) {
          await api.activateAvatar(response.avatar.id);
        }
        Alert.alert('Success', 'Avatar created and set as active!');
      }
      navigation.goBack();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to save avatar';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const updateCustomization = (key: keyof AvatarCustomizations, value: any) => {
    setCustomizations(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateAccessory = (key: keyof AvatarCustomizations['accessories'], value: string | null) => {
    setCustomizations(prev => ({
      ...prev,
      accessories: {
        ...prev.accessories,
        [key]: value,
      },
    }));
  };

  const renderColorPicker = (
    colors: { color: string; name: string }[],
    selected: string,
    onSelect: (color: string) => void
  ) => (
    <View style={styles.colorRow}>
      {colors.map((item) => (
        <TouchableOpacity
          key={item.color}
          style={[
            styles.colorCircle,
            { backgroundColor: item.color },
            selected === item.color && styles.colorCircleSelected,
          ]}
          onPress={() => onSelect(item.color)}
        >
          {selected === item.color && (
            <Ionicons name="checkmark" size={16} color={item.color === '#000000' ? '#FFF' : '#000'} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOptionPicker = (
    options: { id: string | null; name: string }[],
    selected: string | null,
    onSelect: (id: string | null) => void
  ) => (
    <View style={styles.optionRow}>
      {options.map((item) => (
        <TouchableOpacity
          key={item.id || 'none'}
          style={[
            styles.optionButton,
            { backgroundColor: colors.inputBackground },
            selected === item.id && styles.optionButtonSelected,
          ]}
          onPress={() => onSelect(item.id)}
        >
          <Text
            style={[
              styles.optionText,
              { color: colors.text.secondary },
              selected === item.id && styles.optionTextSelected,
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {editingAvatarId ? 'Edit Avatar' : 'Create Avatar'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FBBF24" />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Live Preview */}
        <View style={[styles.previewSection, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View style={styles.previewContainer}>
            <AvatarRenderer
              size={150}
              customizations={customizations}
              style={style}
            />
          </View>
          <TextInput
            style={[styles.nameInput, { color: colors.text.primary, borderColor: colors.border, backgroundColor: colors.card }]}
            value={name}
            onChangeText={setName}
            placeholder="Avatar Name"
            placeholderTextColor={colors.text.tertiary}
            maxLength={50}
          />
        </View>

        {/* Style Selection */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Style</Text>
          <View style={styles.styleRow}>
            {(['cartoon', 'anime', 'minimalist'] as AvatarStyle[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.styleButton,
                  { backgroundColor: colors.inputBackground },
                  style === s && styles.styleButtonSelected,
                ]}
                onPress={() => setStyle(s)}
              >
                <Text
                  style={[
                    styles.styleButtonText,
                    { color: colors.text.secondary },
                    style === s && styles.styleButtonTextSelected,
                  ]}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Skin Tone */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Skin Tone</Text>
          {renderColorPicker(
            SKIN_TONES,
            customizations.skinTone,
            (color) => updateCustomization('skinTone', color)
          )}
        </View>

        {/* Eyes */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Eye Color</Text>
          {renderColorPicker(
            EYE_COLORS,
            customizations.eyeColor,
            (color) => updateCustomization('eyeColor', color)
          )}

          <Text style={[styles.subsectionTitle, { color: colors.text.tertiary }]}>Eye Size</Text>
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderLabel, { color: colors.text.tertiary }]}>Small</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={1.5}
              step={0.1}
              value={customizations.eyeSize}
              onValueChange={(value) => updateCustomization('eyeSize', value)}
              minimumTrackTintColor="#FBBF24"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#FBBF24"
            />
            <Text style={[styles.sliderLabel, { color: colors.text.tertiary }]}>Large</Text>
          </View>
        </View>

        {/* Hair */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Hair Color</Text>
          {renderColorPicker(
            HAIR_COLORS,
            customizations.hairColor,
            (color) => updateCustomization('hairColor', color)
          )}

          <Text style={[styles.subsectionTitle, { color: colors.text.tertiary }]}>Hair Style</Text>
          {renderOptionPicker(
            HAIR_STYLES,
            customizations.hairStyle,
            (id) => updateCustomization('hairStyle', id || 'short')
          )}
        </View>

        {/* Accessories */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Accessories</Text>

          <Text style={[styles.subsectionTitle, { color: colors.text.tertiary }]}>Glasses</Text>
          {renderOptionPicker(
            GLASSES_OPTIONS,
            customizations.accessories.glasses,
            (id) => updateAccessory('glasses', id)
          )}

          <Text style={[styles.subsectionTitle, { color: colors.text.tertiary }]}>Hat</Text>
          {renderOptionPicker(
            HAT_OPTIONS,
            customizations.accessories.hat,
            (id) => updateAccessory('hat', id)
          )}

          <Text style={[styles.subsectionTitle, { color: colors.text.tertiary }]}>Earrings</Text>
          {renderOptionPicker(
            EARRING_OPTIONS,
            customizations.accessories.earrings,
            (id) => updateAccessory('earrings', id)
          )}
        </View>

        {/* Spacer for bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBBF24',
  },
  content: {
    flex: 1,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  previewContainer: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    minWidth: 200,
    backgroundColor: '#FFF',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  styleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  styleButtonSelected: {
    backgroundColor: '#FBBF24',
  },
  styleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  styleButtonTextSelected: {
    color: '#FFF',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: '#111827',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  optionButtonSelected: {
    backgroundColor: '#FBBF24',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  optionTextSelected: {
    color: '#FFF',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
});
