import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

interface GiveCoinsModalProps {
    visible: boolean;
    recipientId: string;
    recipientUsername: string;
    contextType?: string;
    contextId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GiveCoinsModal({
    visible,
    recipientId,
    recipientUsername,
    contextType,
    contextId,
    onClose,
    onSuccess
}: GiveCoinsModalProps) {
    const [amount, setAmount] = useState('1');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const presetAmounts = [1, 3, 5, 10];

    const handleGive = async () => {
        const coinsAmount = parseInt(amount);

        if (isNaN(coinsAmount) || coinsAmount < 1 || coinsAmount > 100) {
            Alert.alert('Invalid Amount', 'Please enter a number between 1 and 100');
            return;
        }

        setSubmitting(true);

        try {
            await api.giveCoins({
                toUserId: recipientId,
                amount: coinsAmount,
                message: message.trim() || undefined,
                contextType,
                contextId
            });

            Alert.alert(
                'Coins Sent!',
                `You gave ${coinsAmount} coin${coinsAmount > 1 ? 's' : ''} to @${recipientUsername}`,
                [{ text: 'Great!', onPress: () => {
                    onSuccess();
                    onClose();
                }}]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to give coins');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Give Positivity Coins</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Recipient */}
                    <View style={styles.recipient}>
                        <Ionicons name="person-circle" size={40} color="#9CA3AF" />
                        <Text style={styles.recipientName}>@{recipientUsername}</Text>
                    </View>

                    {/* Amount Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>How many coins?</Text>

                        <View style={styles.presets}>
                            {presetAmounts.map((preset) => (
                                <TouchableOpacity
                                    key={preset}
                                    style={[
                                        styles.presetButton,
                                        amount === preset.toString() && styles.presetButtonActive
                                    ]}
                                    onPress={() => setAmount(preset.toString())}
                                >
                                    <Text style={[
                                        styles.presetText,
                                        amount === preset.toString() && styles.presetTextActive
                                    ]}>
                                        {preset}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="Custom amount"
                            keyboardType="number-pad"
                            maxLength={3}
                        />
                    </View>

                    {/* Message (Optional) */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Add a message (optional)</Text>
                        <TextInput
                            style={styles.messageInput}
                            value={message}
                            onChangeText={setMessage}
                            placeholder="You're awesome!"
                            multiline
                            maxLength={200}
                        />
                        <Text style={styles.charCount}>{message.length}/200</Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.giveButton, submitting && styles.giveButtonDisabled]}
                            onPress={handleGive}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.giveText}>Give Coins</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modal: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        padding: 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827'
    },
    recipient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 20
    },
    recipientName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 12
    },
    section: {
        marginBottom: 20
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12
    },
    presets: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12
    },
    presetButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFF',
        alignItems: 'center'
    },
    presetButtonActive: {
        borderColor: '#FBBF24',
        backgroundColor: '#FEF3C7'
    },
    presetText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280'
    },
    presetTextActive: {
        color: '#F59E0B'
    },
    amountInput: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        fontSize: 16
    },
    messageInput: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top'
    },
    charCount: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 4
    },
    actions: {
        flexDirection: 'row',
        gap: 12
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center'
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280'
    },
    giveButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center'
    },
    giveButtonDisabled: {
        backgroundColor: '#FCA5A5'
    },
    giveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF'
    }
});
