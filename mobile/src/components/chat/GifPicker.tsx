import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GIF_COLUMNS = 2;
const GIF_SIZE = (SCREEN_WIDTH - 48) / GIF_COLUMNS;

// Tenor API - Free tier, works better than deprecated GIPHY beta key
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Google Tenor API key
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

interface Gif {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gif: Gif) => void;
}

// Theme colors
const themes = {
  dark: {
    background: '#000000',
    cardBackground: '#16181C',
    text: '#E7E9EA',
    textSecondary: '#71767B',
    separator: '#2F3336',
    inputBg: '#202327',
    accent: '#1D9BF0',
  },
  light: {
    background: '#FFFFFF',
    cardBackground: '#F7F9F9',
    text: '#0F1419',
    textSecondary: '#536471',
    separator: '#EFF3F4',
    inputBg: '#F3F4F6',
    accent: '#1D9BF0',
  },
};

export default function GifPicker({ visible, onClose, onSelectGif }: GifPickerProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? themes.dark : themes.light;
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load featured GIFs on mount
  useEffect(() => {
    if (visible) {
      loadFeaturedGifs();
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [visible]);

  const loadFeaturedGifs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${TENOR_BASE_URL}/featured?key=${TENOR_API_KEY}&limit=30&media_filter=gif,tinygif&contentfilter=medium`
      );
      const data = await response.json();

      if (data.results) {
        const formattedGifs = data.results.map((gif: any) => ({
          id: gif.id,
          url: gif.media_formats.gif?.url || gif.media_formats.tinygif?.url,
          previewUrl: gif.media_formats.tinygif?.url || gif.media_formats.gif?.url,
          width: gif.media_formats.tinygif?.dims?.[0] || 200,
          height: gif.media_formats.tinygif?.dims?.[1] || 200,
        }));
        setGifs(formattedGifs);
      } else {
        setGifs([]);
      }
    } catch (err) {
      console.error('Failed to load featured GIFs:', err);
      setError('Failed to load GIFs. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      loadFeaturedGifs();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${TENOR_BASE_URL}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=30&media_filter=gif,tinygif&contentfilter=medium`
      );
      const data = await response.json();

      if (data.results) {
        const formattedGifs = data.results.map((gif: any) => ({
          id: gif.id,
          url: gif.media_formats.gif?.url || gif.media_formats.tinygif?.url,
          previewUrl: gif.media_formats.tinygif?.url || gif.media_formats.gif?.url,
          width: gif.media_formats.tinygif?.dims?.[0] || 200,
          height: gif.media_formats.tinygif?.dims?.[1] || 200,
        }));
        setGifs(formattedGifs);
      } else {
        setGifs([]);
      }
    } catch (err) {
      console.error('Failed to search GIFs:', err);
      setError('Failed to search GIFs');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchGifs(text);
    }, 400);
  };

  const handleSelectGif = (gif: Gif) => {
    onSelectGif(gif);
    onClose();
    setSearchQuery('');
  };

  const renderGifItem = ({ item }: { item: Gif }) => (
    <TouchableOpacity
      style={[styles.gifItem, { backgroundColor: colors.inputBg }]}
      onPress={() => handleSelectGif(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.previewUrl }}
        style={styles.gifImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.separator }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Choose a GIF</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search GIFs..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* GIF Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading GIFs...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.accent }]}
              onPress={loadFeaturedGifs}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={gifs}
            renderItem={renderGifItem}
            keyExtractor={(item) => item.id}
            numColumns={GIF_COLUMNS}
            contentContainerStyle={styles.gifList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {searchQuery ? 'No GIFs found for this search' : 'No GIFs available'}
                </Text>
              </View>
            }
          />
        )}

        {/* Powered by Tenor */}
        <View style={[styles.attribution, { borderTopColor: colors.separator }]}>
          <Text style={[styles.attributionText, { color: colors.textSecondary }]}>Powered by </Text>
          <Text style={[styles.tenorText, { color: colors.text }]}>Tenor</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  gifList: {
    padding: 12,
  },
  gifItem: {
    width: GIF_SIZE,
    height: GIF_SIZE,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  attribution: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  attributionText: {
    fontSize: 12,
  },
  tenorText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
