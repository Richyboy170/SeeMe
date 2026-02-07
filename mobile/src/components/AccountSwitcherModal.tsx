import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Animated,
    Dimensions,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccountContext } from '../contexts/AccountContext';
import Avatar from './Avatar';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AccountSwitcherModalProps {
    visible: boolean;
    onClose: () => void;
    onAddAccount: () => void;
}

export default function AccountSwitcherModal({
    visible,
    onClose,
    onAddAccount,
}: AccountSwitcherModalProps) {
    const {
        accounts,
        activeAccount,
        isSwitching,
        switchAccount,
        removeAccount,
    } = useAccountContext();

    const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, slideAnim]);

    const handleSwitchAccount = async (accountId: string) => {
        if (accountId === activeAccount?.id) {
            onClose();
            return;
        }

        const success = await switchAccount(accountId);
        if (success) {
            onClose();
        }
    };

    const handleRemoveAccount = (accountId: string, username: string) => {
        Alert.alert(
            'Remove Account',
            `Remove @${username} from this device? You can always log back in later.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await removeAccount(accountId);
                        if (accounts.length <= 1) {
                            onClose();
                        }
                    },
                },
            ]
        );
    };

    const handleAddAccount = () => {
        onClose();
        onAddAccount();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <Animated.View
                    style={[
                        styles.container,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    <TouchableOpacity activeOpacity={1}>
                        {/* Handle Bar */}
                        <View style={styles.handleBar} />

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Switch Account</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#8E8E93" />
                            </TouchableOpacity>
                        </View>

                        {/* Switching Overlay */}
                        {isSwitching && (
                            <View style={styles.switchingOverlay}>
                                <ActivityIndicator size="large" color="#FBBF24" />
                                <Text style={styles.switchingText}>Switching account...</Text>
                            </View>
                        )}

                        {/* Account List */}
                        <ScrollView
                            style={styles.accountList}
                            showsVerticalScrollIndicator={false}
                        >
                            {accounts.map((account) => {
                                const isActive = account.id === activeAccount?.id;

                                return (
                                    <TouchableOpacity
                                        key={account.id}
                                        style={[
                                            styles.accountItem,
                                            isActive && styles.activeAccountItem,
                                        ]}
                                        onPress={() => handleSwitchAccount(account.id)}
                                        disabled={isSwitching}
                                    >
                                        <View style={styles.accountInfo}>
                                            <View style={[
                                                styles.avatarWrapper,
                                                isActive && styles.avatarWrapperActive,
                                            ]}>
                                                <Avatar
                                                    size={50}
                                                    avatarUrl={account.avatarUrl}
                                                    username={account.username}
                                                    showBorder={false}
                                                />
                                            </View>
                                            <View style={styles.accountDetails}>
                                                <Text style={styles.username}>@{account.username}</Text>
                                                {account.email && (
                                                    <Text style={styles.email} numberOfLines={1}>
                                                        {account.email}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <View style={styles.accountActions}>
                                            {isActive ? (
                                                <View style={styles.activeIndicator}>
                                                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.removeButton}
                                                    onPress={() => handleRemoveAccount(account.id, account.username)}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Add Account Button */}
                        <TouchableOpacity
                            style={styles.addAccountButton}
                            onPress={handleAddAccount}
                            disabled={isSwitching}
                        >
                            <View style={styles.addAccountIcon}>
                                <Ionicons name="add" size={28} color="#FBBF24" />
                            </View>
                            <Text style={styles.addAccountText}>Add Account</Text>
                        </TouchableOpacity>

                        {/* Safe Area Padding */}
                        <View style={styles.bottomPadding} />
                    </TouchableOpacity>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.7,
        minHeight: 250,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E5EA',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000000',
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        padding: 4,
    },
    switchingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    switchingText: {
        marginTop: 12,
        fontSize: 15,
        color: '#8E8E93',
    },
    accountList: {
        paddingHorizontal: 16,
        paddingTop: 12,
        maxHeight: SCREEN_HEIGHT * 0.4,
    },
    accountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
    },
    activeAccountItem: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#10B981',
    },
    accountInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarWrapper: {
        borderRadius: 27,
        padding: 2,
        backgroundColor: '#E5E5EA',
    },
    avatarWrapperActive: {
        backgroundColor: '#10B981',
    },
    accountDetails: {
        marginLeft: 12,
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    email: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
    accountActions: {
        marginLeft: 12,
    },
    activeIndicator: {
        padding: 4,
    },
    removeButton: {
        padding: 4,
    },
    addAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        marginTop: 8,
    },
    addAccountIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FBBF24',
        borderStyle: 'dashed',
    },
    addAccountText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FBBF24',
        marginLeft: 12,
    },
    bottomPadding: {
        height: 20,
    },
});
