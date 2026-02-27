import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface QRScannerProps {
  onCodeScanned: (code: string) => void;
}

export default function QRScanner({ onCodeScanned }: QRScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    // Extract code from QR data formats:
    // "seeme-meetup:ABCDEF" (from InviteCodeDisplay QR)
    // "...code=ABCDEF" (deep link)
    // "ABCDEF" (raw code)
    let code = data;
    if (data.startsWith('seeme-meetup:')) {
      code = data.replace('seeme-meetup:', '');
    } else if (data.includes('code=')) {
      code = data.split('code=')[1].slice(0, 6);
    }
    onCodeScanned(code.slice(0, 6).toUpperCase());
  };

  const handleManualSubmit = () => {
    if (manualCode.length === 6) {
      onCodeScanned(manualCode.toUpperCase());
    }
  };

  if (showManual) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Enter Invite Code</Text>
        <TextInput
          style={[styles.input, { color: colors.text.primary, backgroundColor: colors.surface, borderColor: colors.border }]}
          value={manualCode}
          onChangeText={(text) => setManualCode(text.toUpperCase().slice(0, 6))}
          placeholder="ABCDEF"
          placeholderTextColor={colors.text.tertiary}
          maxLength={6}
          autoCapitalize="characters"
          autoFocus
        />
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.text.link, opacity: manualCode.length === 6 ? 1 : 0.5 }]}
          onPress={handleManualSubmit}
          disabled={manualCode.length !== 6}
        >
          <Text style={styles.submitText}>Join Meetup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.switchBtn} onPress={() => setShowManual(false)}>
          <Ionicons name="camera-outline" size={20} color={colors.text.link} />
          <Text style={[styles.switchText, { color: colors.text.link }]}>Scan QR Code Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Camera Permission Needed</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          We need camera access to scan QR codes
        </Text>
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.text.link }]} onPress={requestPermission}>
          <Text style={styles.submitText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.switchBtn} onPress={() => setShowManual(true)}>
          <Ionicons name="keypad-outline" size={20} color={colors.text.link} />
          <Text style={[styles.switchText, { color: colors.text.link }]}>Enter Code Manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={[styles.scanFrame, { borderColor: colors.text.link }]} />
        <Text style={styles.scanHint}>Point at your friend's QR code</Text>
      </View>
      <TouchableOpacity
        style={[styles.manualBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        onPress={() => setShowManual(true)}
      >
        <Ionicons name="keypad-outline" size={18} color="#FFF" />
        <Text style={styles.manualBtnText}>Enter Code</Text>
      </TouchableOpacity>
      {scanned && (
        <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
          <Text style={styles.rescanText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  submitBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderRadius: 20,
  },
  scanHint: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  manualBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  manualBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rescanBtn: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  rescanText: {
    color: '#FFF',
    fontSize: 14,
  },
});
