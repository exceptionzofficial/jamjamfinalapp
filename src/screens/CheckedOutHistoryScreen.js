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
    TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { getCheckedOutCustomers, formatDateTime } from '../utils/api';
import { FadeIn, SlideUp } from '../utils/animations';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const CheckedOutHistoryScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadHistory = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const data = await getCheckedOutCustomers();
            setCustomers(data);
            setFilteredCustomers(data);
        } catch (error) {
            console.error('Error loading checkout history:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredCustomers(customers);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = customers.filter(c =>
                (c.name && c.name.toLowerCase().includes(query)) ||
                (c.mobile && c.mobile.includes(query)) ||
                (c.customerId && c.customerId.toLowerCase().includes(query))
            );
            setFilteredCustomers(filtered);
        }
    }, [searchQuery, customers]);

    const onRefresh = () => {
        setRefreshing(true);
        loadHistory(false);
    };

    const renderCustomerItem = ({ item, index }) => (
        <SlideUp delay={index * 50} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
                onPress={() => navigation.navigate('CustomerHistory', { customer: item })}
                style={styles.cardContent}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.customerInfo}>
                        <Text style={[styles.customerName, { color: colors.textPrimary }]}>{item.name}</Text>
                        <Text style={[styles.customerMobile, { color: colors.textSecondary }]}>{item.mobile}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#F3F4F6' }]}>
                        <Text style={[styles.statusText, { color: '#6B7280' }]}>Checked Out</Text>
                    </View>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.footerItem}>
                        <Icon name="clock-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                            Out: {formatDateTime(item.checkoutTime)}
                        </Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </View>
            </TouchableOpacity>
        </SlideUp>
    );

    const renderHeader = () => (
        <View style={styles.headerSection}>
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Icon name="magnify" size={20} color={colors.textMuted} />
                <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder="Search by name, mobile, or ID..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.statsRow}>
                <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.statValue, { color: colors.brand }]}>{customers.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total History</Text>
                </View>
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <FadeIn style={styles.emptyContainer}>
            <Icon name="history" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No History Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery ? "No customers match your search." : "When customers check out, they'll appear here."}
            </Text>
        </FadeIn>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header subtitle="Checkout History" showBack={true} onBack={() => navigation.goBack()} />

            <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.customerId || item.id}
                renderItem={renderCustomerItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={!isLoading && renderEmptyState}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
                }
            />

            {isLoading && (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={colors.brand} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingBottom: 30, paddingHorizontal: 16 },
    headerSection: { marginVertical: 16 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statItem: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    statValue: { fontSize: 20, fontWeight: '700' },
    statLabel: { fontSize: 12, marginTop: 2 },
    card: {
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 2,
    },
    cardContent: { padding: 16 },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    customerInfo: { flex: 1 },
    customerName: { fontSize: 18, fontWeight: '700' },
    customerMobile: { fontSize: 14, marginTop: 2, opacity: 0.8 },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: { fontSize: 11, fontWeight: '600' },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: { fontSize: 13 },
    loader: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});

export default CheckedOutHistoryScreen;
