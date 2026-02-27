import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../theme';

interface InviteCodeDisplayProps {
  inviteCode: string;
  sessionId: string;
}

export default function InviteCodeDisplay({ inviteCode, sessionId }: InviteCodeDisplayProps) {
  const { colors } = useTheme();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my SeeMe Friendship Meetup! Code: ${inviteCode}`,
      });
    } catch (error) {
      // User cancelled
    }
  };

  // QR data encodes the invite code so the scanner can read it directly
  const qrData = `seeme-meetup:${inviteCode}`;

  return (
    <View style={styles.container}>
      {/* QR Code */}
      <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
        <QRCode
          value={qrData}
          size={160}
          color="#000000"
          backgroundColor="#FFFFFF"
        />
        <Text style={styles.qrHint}>Show this to your friend</Text>
      </View>

      {/* Invite Code */}
      <Text style={[styles.label, { color: colors.text.secondary }]}>Or share this code:</Text>
      <View style={[styles.codeContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.code, { color: colors.text.primary }]}>{inviteCode}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleCopy}
        >
          <Ionicons name="copy-outline" size={20} color={colors.text.primary} />
          <Text style={[styles.actionText, { color: colors.text.primary }]}>Copy Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={20} color={colors.text.primary} />
          <Text style={[styles.actionText, { color: colors.text.primary }]}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  qrContainer: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 24,
  },
  qrHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  codeContainer: {
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  code: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
