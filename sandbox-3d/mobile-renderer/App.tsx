/**
 * Sandbox App Entry Point.
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { TestScreen } from './src/screens/TestScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <TestScreen />
    </>
  );
}
