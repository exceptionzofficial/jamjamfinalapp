import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { getCustomerFullHistory, formatDateTime } from '../utils/api';
import { FadeIn, SlideUp } from '../utils/animations';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const CustomerHistoryScreen = ({ route, navigation }) => {
    const { colors } = useTheme();
    const { customer } = route.params || {};

    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ count: 0, total: 0 });

    const loadHistory = useCallback(async (showLoading = true) => {
        if (!customer) return;

        if (showLoading) setIsLoading(true);
        try {
            const data = await getCustomerFullHistory(customer.customerId || customer.id);
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
        };
        return colors_map[service] || colors.brand;
    };

    const renderOrderItem = ({ item }) => (
        <SlideUp style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.serviceBadge, { backgroundColor: getServiceColor(item.service) }]}>
                    <Icon name={getServiceIcon(item.service)} size={16} color="#FFFFFF" />
                    <Text style={styles.serviceText}>{item.service}</Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>
                    {formatDateTime(item.timestamp || item.orderTime || item.createdAt)}
                </Text>
            </View>

            <View style={styles.itemsList}>
                {item.items && item.items.map((subItem, idx) => (
                    <View key={idx} style={styles.itemRow}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>
                            • {subItem.name || subItem.gameName || subItem.typeName || 'Item'}
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
                <View style={[styles.paymentBadge, { backgroundColor: item.paymentMethod === 'Cash' ? '#10B981' : '#8B5CF6' }]}>
                    <Icon name={item.paymentMethod === 'Cash' ? 'cash' : 'qrcode-scan'} size={12} color="#FFFFFF" />
                    <Text style={styles.paymentText}>{item.paymentMethod || 'Paid'}</Text>
                </View>
                <View style={styles.totalContainer}>
                    {item.taxAmount > 0 && (
                        <Text style={[styles.taxLabel, { color: colors.textMuted }]}>
                            (Inc. ₹{item.taxAmount} tax)
                        </Text>
                    )}
                    <Text style={[styles.totalAmount, { color: colors.brand }]}>
                        ₹{item.totalAmount}
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
                    <Text style={[styles.customerId, { color: colors.textMuted }]}>ID: {customer?.customerId || customer?.id || 'JJ-...'}</Text>
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
                <FlatList
                    data={history}
                    keyExtractor={(item, index) => item.id || item.orderId || item.bookingId || `history-${index}`}
                    renderItem={renderOrderItem}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
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
});

export default CustomerHistoryScreen;
