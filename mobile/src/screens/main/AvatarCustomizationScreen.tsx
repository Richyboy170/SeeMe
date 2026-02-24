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

const NATURAL_HAIR_COLORS = [
  { color: '#000000', name: 'Black' },
  { color: '#4A3728', name: 'Brown' },
  { color: '#D4A574', name: 'Blonde' },
  { color: '#8B4513', name: 'Auburn' },
  { color: '#808080', name: 'Gray' },
  { color: '#FF6B6B', name: 'Red' },
  { color: '#FFFFFF', name: 'White' },
  { color: '#C45C34', name: 'Ginger' },
  { color: '#6B3A2A', name: 'Chestnut' },
];

const FANTASY_HAIR_COLORS = [
  { color: '#9B59B6', name: 'Purple' },
  { color: '#3498DB', name: 'Blue' },
  { color: '#FF69B4', name: 'Pink' },
  { color: '#20B2AA', name: 'Teal' },
  { color: '#2ECC71', name: 'Green' },
  { color: '#FF8C00', name: 'Orange' },
  { color: '#B39DDB', name: 'Lavender' },
];

const EYE_COLORS = [
  { color: '#8B4513', name: 'Brown' },
  { color: '#2E86AB', name: 'Blue' },
  { color: '#228B22', name: 'Green' },
  { color: '#808080', name: 'Gray' },
  { color: '#DEB887', name: 'Hazel' },
  { color: '#000000', name: 'Black' },
];

const ALL_HAIR_STYLES = [
  { id: 'short', name: 'Short', affinity: 'neutral' },
  { id: 'medium', name: 'Medium', affinity: 'neutral' },
  { id: 'long', name: 'Long', affinity: 'neutral' },
  { id: 'curly', name: 'Curly', affinity: 'neutral' },
  { id: 'wavy', name: 'Wavy', affinity: 'neutral' },
  { id: 'bald', name: 'Bald', affinity: 'neutral' },
  { id: 'ponytail', name: 'Ponytail', affinity: 'neutral' },
  { id: 'bun', name: 'Bun', affinity: 'neutral' },
  // Male-oriented
  { id: 'buzz', name: 'Buzz', affinity: 'male' },
  { id: 'fade', name: 'Fade', affinity: 'male' },
  { id: 'spiky', name: 'Spiky', affinity: 'male' },
  { id: 'mohawk', name: 'Mohawk', affinity: 'male' },
  { id: 'crew-cut', name: 'Crew Cut', affinity: 'male' },
  // Female-oriented
  { id: 'pixie', name: 'Pixie', affinity: 'female' },
  { id: 'bob', name: 'Bob', affinity: 'female' },
  { id: 'braids', name: 'Braids', affinity: 'female' },
  { id: 'side-swept', name: 'Side Swept', affinity: 'female' },
  { id: 'twin-tails', name: 'Twin Tails', affinity: 'female' },
  { id: 'afro', name: 'Afro', affinity: 'neutral' },
];

const FACE_SHAPES = [
  { id: null, name: 'Default' },
  { id: 'oval', name: 'Oval' },
  { id: 'round', name: 'Round' },
  { id: 'square', name: 'Square' },
  { id: 'heart', name: 'Heart' },
];

const EYEBROW_STYLES = [
  { id: null, name: 'Default' },
  { id: 'thin', name: 'Thin' },
  { id: 'thick', name: 'Thick' },
  { id: 'arched', name: 'Arched' },
  { id: 'flat', name: 'Flat' },
  { id: 'bushy', name: 'Bushy' },
];

const NOSE_STYLES = [
  { id: null, name: 'Default' },
  { id: 'small', name: 'Small' },
  { id: 'medium', name: 'Medium' },
  { id: 'pointed', name: 'Pointed' },
  { id: 'button', name: 'Button' },
];

const MOUTH_STYLES = [
  { id: null, name: 'Default' },
  { id: 'smile', name: 'Smile' },
  { id: 'neutral', name: 'Neutral' },
  { id: 'smirk', name: 'Smirk' },
  { id: 'open', name: 'Open' },
];

const FACIAL_HAIR_OPTIONS = [
  { id: null, name: 'None' },
  { id: 'stubble', name: 'Stubble' },
  { id: 'mustache', name: 'Mustache' },
  { id: 'full-beard', name: 'Full Beard' },
  { id: 'goatee', name: 'Goatee' },
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
    gender: null,
    faceShape: null,
    facialHair: null,
    eyebrowStyle: null,
    mouthStyle: null,
    noseStyle: null,
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
      setCustomizations({
        skinTone: avatar.customizations.skinTone,
        eyeColor: avatar.customizations.eyeColor,
        eyeSize: avatar.customizations.eyeSize,
        hairColor: avatar.customizations.hairColor,
        hairStyle: avatar.customizations.hairStyle,
        accessories: avatar.customizations.accessories,
        gender: avatar.customizations.gender || null,
        faceShape: avatar.customizations.faceShape || null,
        facialHair: avatar.customizations.facialHair || null,
        eyebrowStyle: avatar.customizations.eyebrowStyle || null,
        mouthStyle: avatar.customizations.mouthStyle || null,
        noseStyle: avatar.customizations.noseStyle || null,
      });
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

  // Get sorted hairstyles based on gender selection
  const getSortedHairStyles = () => {
    const gender = customizations.gender;
    if (!gender) return ALL_HAIR_STYLES;

    // Show gender-relevant styles first, then neutral, then the other gender
    const relevant = ALL_HAIR_STYLES.filter(s => s.affinity === gender);
    const neutral = ALL_HAIR_STYLES.filter(s => s.affinity === 'neutral');
    const other = ALL_HAIR_STYLES.filter(s => s.affinity !== gender && s.affinity !== 'neutral');
    return [...relevant, ...neutral, ...other];
  };

  const renderColorPicker = (
    colorList: { color: string; name: string }[],
    selected: string,
    onSelect: (color: string) => void
  ) => (
    <View style={styles.colorRow}>
      {colorList.map((item) => (
        <TouchableOpacity
          key={item.color}
          style={[
            styles.colorCircle,
            { backgroundColor: item.color },
            item.color === '#FFFFFF' && { borderColor: '#D1D5DB', borderWidth: 2 },
            selected === item.color && styles.colorCircleSelected,
          ]}
          onPress={() => onSelect(item.color)}
        >
          {selected === item.color && (
            <Ionicons name="checkmark" size={16} color={item.color === '#000000' ? '#FFF' : item.color === '#FFFFFF' ? '#000' : '#000'} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOptionPicker = (
    options: { id: string | null; name: string }[],
    selected: string | null | undefined,
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
              size={200}
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

        {/* Body Type / Gender */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Body Type</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                { backgroundColor: colors.inputBackground },
                customizations.gender === null && styles.genderButtonSelected,
              ]}
              onPress={() => {
                updateCustomization('gender', null);
                updateCustomization('facialHair', null);
              }}
            >
              <Ionicons
                name="person-outline"
                size={28}
                color={customizations.gender === null ? '#FFF' : colors.text.secondary}
              />
              <Text style={[
                styles.genderText,
                { color: colors.text.secondary },
                customizations.gender === null && styles.genderTextSelected,
              ]}>Unisex</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                { backgroundColor: colors.inputBackground },
                customizations.gender === 'male' && styles.genderButtonSelected,
              ]}
              onPress={() => updateCustomization('gender', 'male')}
            >
              <Ionicons
                name="male-outline"
                size={28}
                color={customizations.gender === 'male' ? '#FFF' : colors.text.secondary}
              />
              <Text style={[
                styles.genderText,
                { color: colors.text.secondary },
                customizations.gender === 'male' && styles.genderTextSelected,
              ]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                { backgroundColor: colors.inputBackground },
                customizations.gender === 'female' && styles.genderButtonSelected,
              ]}
              onPress={() => {
                updateCustomization('gender', 'female');
                updateCustomization('facialHair', null);
              }}
            >
              <Ionicons
                name="female-outline"
                size={28}
                color={customizations.gender === 'female' ? '#FFF' : colors.text.secondary}
              />
              <Text style={[
                styles.genderText,
                { color: colors.text.secondary },
                customizations.gender === 'female' && styles.genderTextSelected,
              ]}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Face Shape */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Face Shape</Text>
          {renderOptionPicker(
            FACE_SHAPES,
            customizations.faceShape,
            (id) => updateCustomization('faceShape', id)
          )}
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

        {/* Eyebrow Style */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Eyebrow Style</Text>
          {renderOptionPicker(
            EYEBROW_STYLES,
            customizations.eyebrowStyle,
            (id) => updateCustomization('eyebrowStyle', id)
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

        {/* Nose Style */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Nose Style</Text>
          {renderOptionPicker(
            NOSE_STYLES,
            customizations.noseStyle,
            (id) => updateCustomization('noseStyle', id)
          )}
        </View>

        {/* Mouth Style */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Mouth Style</Text>
          {renderOptionPicker(
            MOUTH_STYLES,
            customizations.mouthStyle,
            (id) => updateCustomization('mouthStyle', id)
          )}
        </View>

        {/* Facial Hair (male only) */}
        {customizations.gender === 'male' && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Facial Hair</Text>
            {renderOptionPicker(
              FACIAL_HAIR_OPTIONS,
              customizations.facialHair,
              (id) => updateCustomization('facialHair', id)
            )}
          </View>
        )}

        {/* Hair */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Hair Color</Text>
          <Text style={[styles.subsectionTitle, { color: colors.text.tertiary, marginTop: 0 }]}>Natural</Text>
          {renderColorPicker(
            NATURAL_HAIR_COLORS,
            customizations.hairColor,
            (color) => updateCustomization('hairColor', color)
          )}

          <Text style={[styles.subsectionTitle, { color: colors.text.tertiary }]}>Fantasy</Text>
          {renderColorPicker(
            FANTASY_HAIR_COLORS,
            customizations.hairColor,
            (color) => updateCustomization('hairColor', color)
          )}

          <Text style={[styles.subsectionTitle, { color: colors.text.tertiary }]}>Hair Style</Text>
          {renderOptionPicker(
            getSortedHairStyles(),
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
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  genderButtonSelected: {
    backgroundColor: '#FBBF24',
  },
  genderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  genderTextSelected: {
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
