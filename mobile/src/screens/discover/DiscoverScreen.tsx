import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PeopleTab from './PeopleTab';
import CommunitiesTab from './CommunitiesTab';

type TabType = 'communities' | 'people';

interface DiscoverScreenProps {
  navigation: any;
}

export default function DiscoverScreen({ navigation }: DiscoverScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('communities');
  const [searchQuery, setSearchQuery] = useState('');

  // Update header with Create Topic button (only on Communities tab)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        activeTab === 'communities' ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('CreateTopic')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#7C3AED" />
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery(''); // Clear search when switching tabs
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Shared Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'people'
                ? 'Search users...'
                : 'Search communities...'
            }
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'people' && styles.activeTab]}
          onPress={() => handleTabChange('people')}
        >
          <Ionicons
            name={activeTab === 'people' ? 'people' : 'people-outline'}
            size={18}
            color={activeTab === 'people' ? '#14B8A6' : '#8E8E93'}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
            People
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'communities' && styles.activeTab]}
          onPress={() => handleTabChange('communities')}
        >
          <Ionicons
            name={activeTab === 'communities' ? 'compass' : 'compass-outline'}
            size={18}
            color={activeTab === 'communities' ? '#14B8A6' : '#8E8E93'}
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'communities' && styles.activeTabText]}>
            Communities
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content - Keep both mounted to preserve state */}
      <View style={[styles.tabContent, activeTab !== 'people' && styles.hiddenTab]}>
        <PeopleTab searchQuery={searchQuery} navigation={navigation} />
      </View>
      <View style={[styles.tabContent, activeTab !== 'communities' && styles.hiddenTab]}>
        <CommunitiesTab searchQuery={searchQuery} navigation={navigation} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#14B8A6',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  hiddenTab: {
    display: 'none',
  },
});
