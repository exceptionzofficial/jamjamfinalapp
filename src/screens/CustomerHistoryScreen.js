import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    SectionList,
    Alert,
    useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { getCustomerFullHistory, formatDateTime, updateCustomer } from '../utils/api';
import { FadeIn, SlideUp } from '../utils/animations';

const CustomerHistoryScreen = ({ route, navigation }) => {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const { customer } = route.params || {};

    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ count: 0, total: 0 });
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    const loadHistory = useCallback(async (showLoading = true) => {
        if (!customer) return;

        if (showLoading) setIsLoading(true);
        try {
            const customerId = customer.customerId || customer.id;
            console.log('Loading history for customer:', customerId);
            const data = await getCustomerFullHistory(customerId);
            console.log('History loaded:', data.length, 'items');

            // Log combo orders specifically
            const combos = data.filter(item => item.service === 'Combo');
            if (combos.length > 0) {
                console.log('Combo orders found:', combos.length);
                combos.forEach(combo => {
                    console.log('Combo:', combo.comboName, 'Items:', combo.items?.length || 0);
                });
            }

            setHistory(data);

            // Calculate stats
            const total = data.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
            setStats({ count: data.length, total });
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [customer]);

    const groupHistoryByDate = (data) => {
        const groups = {};
        data.forEach(item => {
            const dateStr = new Date(item.timestamp || item.orderTime || item.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            if (!groups[dateStr]) {
                groups[dateStr] = [];
            }
            groups[dateStr].push(item);
        });

        return Object.keys(groups).map(date => ({
            title: date,
            data: groups[date]
        }));
    };

    const sections = groupHistoryByDate(history);

    const handleCheckin = async () => {
        const customerId = customer.customerId || customer.id;

        setIsCheckingIn(true);
        try {
            await updateCustomer(customerId, {
                status: 'checked-in',
                checkinTime: new Date().toISOString()
            });
            Alert.alert('Success', 'Customer checked-in successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('HomeTabs') }
            ]);
        } catch (error) {
            console.error('Check-in error:', error);
            Alert.alert('Error', 'Failed to check-in customer. Please try again.');
        } finally {
            setIsCheckingIn(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const onRefresh = () => {
        setRefreshing(true);
        loadHistory(false);
    };

    const getServiceIcon = (service) => {
        const icons = {
            'Games': 'gamepad-variant',
            'Restaurant': 'silverware-fork-knife',
            'Bakery': 'cupcake',
            'Juice Bar': 'cup',
            'Massage': 'spa',
            'Pool': 'pool',
            'Swimming Pool': 'pool',
            'Combo': 'package-variant',
            'ROOM': 'bed',
        };
        return icons[service] || 'tag';
    };

    const getServiceColor = (service) => {
        const colors_map = {
            'Games': '#8B5CF6',      // Purple
            'Restaurant': '#EF4444', // Red
            'Bakery': '#EC4899',     // Pink
            'Juice Bar': '#F59E0B',  // Amber
            'Massage': '#10B981',    // Emerald
            'Pool': '#3B82F6',       // Blue
            'Swimming Pool': '#3B82F6', // Blue (same as Pool)
            'Combo': '#F97316',      // Orange
            'ROOM': '#06B6D4',       // Cyan
        };
        return colors_map[service] || colors.brand;
    };

    const renderOrderItem = ({ item }) => (
        <SlideUp style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={[styles.serviceBadge, { backgroundColor: getServiceColor(item.service) }]}>
                        <Icon name={getServiceIcon(item.service)} size={16} color="#FFFFFF" />
                        <Text style={styles.serviceText}>{item.service}</Text>
                    </View>
                    {item.comboName && (
                        <Text style={[styles.comboNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.comboName}
                        </Text>
                    )}
                </View>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>
                    {formatDateTime(item.timestamp || item.orderTime || item.createdAt)}
                </Text>
            </View>

            <View style={styles.itemsList}>
                {item.items && item.items.map((subItem, idx) => (
                    <View key={idx} style={styles.itemRow}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                            • {subItem.name || subItem.itemName || subItem.gameName || subItem.typeName || 'Item'}
                        </Text>
                        <Text style={[styles.itemQty, { color: colors.textSecondary }]}>
                            x{subItem.quantity || subItem.coinCount || 1}
                        </Text>
                        <Text style={[styles.itemPrice, { color: colors.textPrimary }]}>
                            ₹{subItem.subtotal || subItem.price || 0}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View style={[styles.paymentBadge, { backgroundColor: item.paymentMethod === 'Cash' ? '#10B981' : item.paymentMethod === 'Pay Later' ? '#F59E0B' : '#8B5CF6' }]}>
                    <Icon name={item.paymentMethod === 'Cash' ? 'cash' : item.paymentMethod === 'Pay Later' ? 'clock-outline' : 'qrcode-scan'} size={12} color="#FFFFFF" />
                    <Text style={styles.paymentText}>{item.paymentMethod || 'Paid'}</Text>
                </View>
                <View style={styles.totalContainer}>
                    {item.comboDiscount > 0 && (
                        <Text style={[styles.discountLabel, { color: '#10B981' }]}>
                            Saved ₹{item.comboDiscount || 0}
                        </Text>
                    )}
                    {item.taxAmount > 0 && (
                        <Text style={[styles.taxLabel, { color: colors.textMuted }]}>
                            (Inc. ₹{item.taxAmount || 0} tax)
                        </Text>
                    )}
                    <Text style={[styles.totalAmount, { color: colors.brand }]}>
                        ₹{item.totalAmount || 0}
                    </Text>
                </View>
            </View>
        </SlideUp>
    );

    const renderHeader = () => (
        <View style={styles.headerInfo}>
            <View style={[styles.customerProfile, { backgroundColor: colors.card, borderColor: colors.brand }]}>
                <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
                    <Icon name="account" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.customerMeta}>
                    <Text style={[styles.profileName, { color: colors.textPrimary }]}>{customer?.name || 'Customer'}</Text>
                    <Text style={[styles.profileMobile, { color: colors.textSecondary }]}>{customer?.mobile || 'N/A'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={[styles.customerId, { color: colors.textMuted }]}>ID: {customer?.customerId || customer?.id || 'JJ-...'}</Text>
                        {customer?.status !== 'checked-in' && (
                            <TouchableOpacity
                                style={[styles.checkinBtn, { backgroundColor: colors.brand }]}
                                onPress={handleCheckin}
                                disabled={isCheckingIn}
                            >
                                <Icon name={isCheckingIn ? 'loading' : 'account-check'} size={14} color="#FFFFFF" />
                                <Text style={styles.checkinBtnText}>{isCheckingIn ? '...' : 'Check-in'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statValue, { color: colors.brand }]}>{stats.count}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Orders</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>₹{stats.total}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Spent</Text>
                </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Order Timeline</Text>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Icon name="history" size={80} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No history found for this customer</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Customer History" subtitle="Centralized View" />

            <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
            >
                <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
            </TouchableOpacity>

            {isLoading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.brand} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Fetching history...</Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => item.id || item.orderId || item.bookingId || `history-${index}`}
                    renderItem={renderOrderItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                            <View style={[styles.dateDivider, { backgroundColor: colors.brand }]} />
                            <Text style={[styles.sectionHeaderText, { color: colors.textPrimary }]}>{title}</Text>
                        </View>
                    )}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    stickySectionHeadersEnabled={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    backText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    headerInfo: {
        marginBottom: 20,
    },
    customerProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    customerMeta: {
        marginLeft: 16,
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
    },
    profileMobile: {
        fontSize: 15,
        marginTop: 2,
    },
    customerId: {
        fontSize: 12,
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    serviceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    serviceText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
    },
    dateText: {
        fontSize: 11,
    },
    itemsList: {
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    itemName: {
        flex: 1,
        fontSize: 14,
    },
    itemQty: {
        fontSize: 13,
        marginHorizontal: 8,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        minWidth: 60,
        textAlign: 'right',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    paymentText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4,
    },
    totalContainer: {
        alignItems: 'flex-end',
    },
    taxLabel: {
        fontSize: 10,
        marginBottom: 2,
    },
    discountLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 2,
    },
    comboNameText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: '800',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    checkinBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    checkinBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginTop: 8,
        gap: 12,
    },
    sectionHeaderText: {
        fontSize: 15,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dateDivider: {
        height: 20,
        width: 4,
        borderRadius: 2,
    },
});

export default CustomerHistoryScreen;
