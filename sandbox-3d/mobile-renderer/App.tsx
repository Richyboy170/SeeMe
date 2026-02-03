/**
 * Sandbox App Entry Point.
 */
import 'react-native-gesture-handler';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Temporarily disabled for build testing
// import { TestScreen } from './src/screens/TestScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.text}>SeeMe 3D Sandbox</Text>
      <Text style={styles.subtext}>Build test successful!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtext: {
    color: '#a1a1aa',
    fontSize: 16,
    marginTop: 10,
  },
});
