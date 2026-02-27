import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation';
import { ThemeProvider, useTheme } from './src/theme';
import { CoinCelebrationProvider } from './src/contexts/CoinCelebrationContext';
import { BotCoinToastProvider } from './src/contexts/BotCoinToastContext';
import { WelcomeMottoProvider } from './src/contexts/WelcomeMottoContext';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <CoinCelebrationProvider>
          <BotCoinToastProvider>
            <WelcomeMottoProvider>
              <AppContent />
            </WelcomeMottoProvider>
          </BotCoinToastProvider>
        </CoinCelebrationProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
