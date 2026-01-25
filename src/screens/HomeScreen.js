import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
    Modal,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import CustomerCard from '../components/CustomerCard';
import ServiceCard, { SERVICES } from '../components/ServiceCard';
import BannerCarousel from '../components/BannerCarousel';
import { useTheme } from '../context/ThemeContext';
import { getRecentCustomers, searchCustomers, addToRecent, getCustomerBookings, formatDateTime } from '../utils/api';
import { FadeIn, SlideUp, StaggerItem } from '../utils/animations';
// Note: FadeIn/SlideUp removed from search header to prevent search lag

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const HomeScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState([]);
    const [recentCustomers, setRecentCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Debounce timer ref
    const searchTimeoutRef = useRef(null);

    // History modal states
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [customerBookings, setCustomerBookings] = useState([]);

    const loadRecentCustomers = useCallback(async () => {
        try {
            const recent = await getRecentCustomers();
            // Only update if data has actually changed (compare by ID list)
            setRecentCustomers(prev => {
                const prevIds = prev.map(c => c.customerId || c.id).join(',');
                const newIds = recent.map(c => c.customerId || c.id).join(',');
                if (prevIds !== newIds) {
                    return recent; // Data changed, update
                }
                return prev; // No change, keep same reference
            });
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadRecentCustomers();
    }, []);

    // Auto-refresh every 5 seconds for live data (paused while searching)
    useEffect(() => {
        // Don't auto-refresh while user is searching - prevents lag and re-renders
        if (searchQuery.length > 0) {
            return;
        }

        const intervalId = setInterval(() => {
            loadRecentCustomers();
        }, 5000);

        return () => clearInterval(intervalId);
    }, [loadRecentCustomers, searchQuery]);

    // Reload on screen focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadRecentCustomers();
            setSelectedCustomer(null);
            setSearchQuery('');
            setCustomers([]);
        });
        return unsubscribe;
    }, [navigation, loadRecentCustomers]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Debounced search function
    const performSearch = useCallback(async (query) => {
        if (query.trim().length > 0) {
            setIsSearching(true);
            try {
                const results = await searchCustomers(query);
                setCustomers(results);
            } catch (error) {
                console.error('Search error:', error);
                setCustomers([]);
            } finally {
                setIsSearching(false);
            }
        } else {
            setCustomers([]);
        }
    }, []);

    // Handle search input with debounce
    const handleSearch = useCallback((query) => {
        setSearchQuery(query); // Track search mode

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (query.trim().length === 0) {
            setCustomers([]);
            return;
        }

        // Set new debounced search (500ms delay)
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(query);
        }, 500);
    }, [performSearch]);

    const handleClearSearch = useCallback(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        setSearchQuery('');
        setCustomers([]);
    }, []);

    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        await addToRecent(customer);
        loadRecentCustomers();
    };

    const handleBackToSearch = () => {
        setSelectedCustomer(null);
    };

    const handleServicePress = (service) => {
        if (service.id === 'games') {
            navigation.navigate('Games', { customer: selectedCustomer });
        } else if (service.id === 'restaurants') {
            navigation.navigate('Restaurant', { customer: selectedCustomer });
        } else if (service.id === 'bakery') {
            navigation.navigate('Bakery', { customer: selectedCustomer });
        } else if (service.id === 'juice') {
            navigation.navigate('JuiceBar', { customer: selectedCustomer });
        } else {
            console.log('Service selected:', service.name, 'for customer:', selectedCustomer?.name);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRecentCustomers();
        setRefreshing(false);
    }, [loadRecentCustomers]);

    // History functions
    const openHistory = useCallback(async () => {
        const customerId = selectedCustomer?.customerId || selectedCustomer?.id;
        if (!customerId) return;
        const bookings = await getCustomerBookings(customerId);
        setCustomerBookings(bookings);
        setShowHistoryModal(true);
    }, [selectedCustomer]);

    const closeHistoryModal = useCallback(() => {
        setShowHistoryModal(false);
    }, []);

    // Get service icon by name
    const getServiceIcon = (serviceName) => {
        const icons = {
            'Games': 'gamepad-variant',
            'Restaurants': 'silverware-fork-knife',
            'Bakery': 'cupcake',
            'Juice Bar': 'cup',
            'Massage': 'spa',
            'Pool': 'pool',
            'Rooms': 'bed',
            'Theater': 'theater',
            'Function Halls': 'party-popper',
            'Bar': 'glass-cocktail',
        };
        return icons[serviceName] || 'apps';
    };

    // Render services grid header
    const renderServicesHeader = () => (
        <>
            <SlideUp delay={100}>
                <View style={[styles.customerBanner, { backgroundColor: colors.card, borderColor: colors.brand }]}>
                    <TouchableOpacity onPress={handleBackToSearch} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.customerInfo}>
                        <Text style={[styles.customerName, { color: colors.textPrimary }]}>{selectedCustomer.name}</Text>
                        <Text style={[styles.customerMobile, { color: colors.textSecondary }]}>{selectedCustomer.mobile}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.historyBtn, { backgroundColor: colors.accent }]}
                        onPress={openHistory}
                    >
                        <Icon name="history" size={18} color="#FFFFFF" />
                        <Text style={styles.historyBtnText}>History</Text>
                    </TouchableOpacity>
                </View>
            </SlideUp>

            <FadeIn delay={200}>
                <BannerCarousel />
            </FadeIn>

            <SlideUp delay={300}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Select Service</Text>
            </SlideUp>
        </>
    );

    // Render service grid item with proper alignment
    const renderServiceItem = ({ item: service, index }) => {
        return (
            <StaggerItem index={index} delay={80} style={styles.serviceGridItem}>
                <ServiceCard service={service} onPress={handleServicePress} />
            </StaggerItem>
        );
    };

    // Render list header - NO SearchBar here (moved outside FlatList to prevent keyboard issues)
    const renderListHeader = () => (
        <View>
            <TouchableOpacity
                style={[styles.newBookingButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('NewCustomer')}
                activeOpacity={0.8}
            >
                <Icon name="account-plus" size={22} color={colors.textOnAccent} />
                <Text style={[styles.newBookingText, { color: colors.textOnAccent }]}>New Booking</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {searchQuery.length > 0 ? `Search Results (${customers.length})` : 'Recent Customers'}
            </Text>
        </View>
    );

    // Empty state - no animations for better performance
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Icon
                name={searchQuery.length > 0 ? 'account-search' : 'account-group'}
                size={48}
                color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {searchQuery.length > 0 ? 'No customers found' : 'No recent customers'}
            </Text>
            {searchQuery.length === 0 && (
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                    Search for a customer or create a new booking
                </Text>
            )}
        </View>
    );

    // Render customer item - no animation wrapper for smoother search
    const renderCustomerItem = ({ item, index }) => (
        <CustomerCard customer={item} onPress={handleSelectCustomer} />
    );

    // History Modal
    const renderHistoryModal = () => (
        <Modal visible={showHistoryModal} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={[styles.historyModalContent, { backgroundColor: colors.card }]}>
                    <View style={styles.historyHeader}>
                        <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
                            Booking History
                        </Text>
                        <TouchableOpacity onPress={closeHistoryModal}>
                            <Icon name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.historyCustomer, { color: colors.textSecondary }]}>
                        {selectedCustomer?.name} • {selectedCustomer?.mobile}
                    </Text>

                    {/* Stats Summary */}
                    {customerBookings.length > 0 && (
                        <View style={styles.historyStats}>
                            <View style={[styles.historyStat, { backgroundColor: colors.surfaceLight }]}>
                                <Text style={[styles.historyStatValue, { color: colors.brand }]}>
                                    {customerBookings.length}
                                </Text>
                                <Text style={[styles.historyStatLabel, { color: colors.textMuted }]}>
                                    Total Visits
                                </Text>
                            </View>
                            <View style={[styles.historyStat, { backgroundColor: colors.surfaceLight }]}>
                                <Text style={[styles.historyStatValue, { color: '#10B981' }]}>
                                    ₹{customerBookings.reduce((sum, b) => sum + b.totalAmount, 0)}
                                </Text>
                                <Text style={[styles.historyStatLabel, { color: colors.textMuted }]}>
                                    Total Spent
                                </Text>
                            </View>
                        </View>
                    )}

                    {customerBookings.length === 0 ? (
                        <View style={styles.emptyHistory}>
                            <Icon name="history" size={64} color={colors.border} />
                            <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                                No booking history yet
                            </Text>
                            <Text style={[styles.emptyHistorySubtext, { color: colors.textMuted }]}>
                                Complete a service booking to see history
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={customerBookings}
                            keyExtractor={(item, index) => item.bookingId || item.id || `booking-${index}`}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <View style={[styles.historyCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                                    <View style={styles.historyCardHeader}>
                                        <View style={[styles.historyServiceBadge, { backgroundColor: colors.brand }]}>
                                            <Icon name={getServiceIcon(item.service)} size={14} color="#FFFFFF" />
                                            <Text style={styles.historyServiceText}>{item.service}</Text>
                                        </View>
                                        <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                                            {formatDateTime(item.timestamp)}
                                        </Text>
                                    </View>

                                    <View style={styles.historyItems}>
                                        {item.items.slice(0, 3).map((bookingItem, idx) => (
                                            <Text key={idx} style={[styles.historyItemText, { color: colors.textPrimary }]}>
                                                • {bookingItem.gameName || bookingItem.name} × {bookingItem.coinCount || bookingItem.quantity} = ₹{bookingItem.subtotal}
                                            </Text>
                                        ))}
                                        {item.items.length > 3 && (
                                            <Text style={[styles.historyItemMore, { color: colors.textMuted }]}>
                                                +{item.items.length - 3} more items
                                            </Text>
                                        )}
                                    </View>

                                    <View style={styles.historyCardFooter}>
                                        <View style={[styles.paymentBadge, { backgroundColor: item.paymentMethod === 'Cash' ? '#10B981' : '#8B5CF6' }]}>
                                            <Icon name={item.paymentMethod === 'Cash' ? 'cash' : 'qrcode-scan'} size={12} color="#FFFFFF" />
                                            <Text style={styles.paymentBadgeText}>{item.paymentMethod}</Text>
                                        </View>
                                        <Text style={[styles.historyTotal, { color: colors.brand }]}>
                                            ₹{item.totalAmount}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );

    if (selectedCustomer) {
        const numColumns = isTablet ? 4 : 2;

        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header subtitle="Employee Portal" showTypewriter={true} />
                <FlatList
                    data={SERVICES}
                    keyExtractor={(item) => item.id}
                    renderItem={renderServiceItem}
                    numColumns={numColumns}
                    key={`grid-${numColumns}`}
                    ListHeaderComponent={renderServicesHeader}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />
                {renderHistoryModal()}
            </View>
        );
    }

    const displayData = searchQuery.length > 0 ? customers : recentCustomers;
    const isSearchActive = searchQuery.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Disable typewriter animation during search to prevent re-renders */}
            <Header subtitle="Your Resort Companion" showTypewriter={!isSearchActive} />

            {/* SearchBar OUTSIDE FlatList to prevent keyboard dismissal on re-renders */}
            <SearchBar
                onSearch={handleSearch}
                onClear={handleClearSearch}
                placeholder="Search customer by name or mobile..."
            />

            <FlatList
                data={displayData}
                keyExtractor={(item, index) => item.customerId || item.id || `customer-${index}`}
                renderItem={renderCustomerItem}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                removeClippedSubviews={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.accent]}
                        tintColor={colors.accent}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: 100,
        paddingHorizontal: 8,
    },
    columnWrapper: {
        justifyContent: 'flex-start',
    },
    serviceGridItem: {
        width: isTablet ? '25%' : '50%',
        padding: 6,
    },
    newBookingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
        marginBottom: 16,
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    newBookingText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 8,
        marginTop: 8,
        marginBottom: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 4,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    customerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
        marginVertical: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 12,
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 18,
        fontWeight: '600',
    },
    customerMobile: {
        fontSize: 14,
        marginTop: 2,
    },
    historyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    historyBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
    },
    // History Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    historyModalContent: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '85%',
        borderRadius: 20,
        padding: 20,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    historyTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    historyCustomer: {
        fontSize: 14,
        marginBottom: 12,
    },
    historyStats: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    historyStat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    historyStatValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    historyStatLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    emptyHistory: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyHistoryText: {
        fontSize: 16,
        marginTop: 12,
    },
    emptyHistorySubtext: {
        fontSize: 13,
        marginTop: 4,
        textAlign: 'center',
    },
    historyCard: {
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    historyServiceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    historyServiceText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    historyDate: {
        fontSize: 11,
    },
    historyItems: {
        marginBottom: 10,
    },
    historyItemText: {
        fontSize: 13,
        lineHeight: 20,
    },
    historyItemMore: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 4,
    },
    historyCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 10,
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    paymentBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    },
    historyTotal: {
        fontSize: 18,
        fontWeight: '700',
    },
});

export default HomeScreen;
