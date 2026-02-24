import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Modal,
    ActivityIndicator,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import CustomerCard from '../components/CustomerCard';
import ServiceCard, { SERVICES } from '../components/ServiceCard';
import BannerCarousel from '../components/BannerCarousel';
import { useTheme } from '../context/ThemeContext';
import {
    getRecentCustomers,
    searchCustomers,
    addToRecent,
    getCustomerRestaurantOrders,
    getCustomerFullHistory,
    checkoutCustomer,
    formatDateTime
} from '../utils/api';
import { FadeIn, SlideUp, StaggerItem } from '../utils/animations';

// Safe Dimensions access with fallback
let isTablet = false;
try {
    isTablet = Dimensions.get('window').width >= 768;
} catch (error) {
    console.warn('Dimensions not available during HomeScreen initialization');
}

const HomeScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    // Update local isTablet to reflect actual current width (handles orientation changes)
    const isTabletLocal = width >= 768;
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState([]);
    const [recentCustomers, setRecentCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);
    const [checkoutCustomerData, setCheckoutCustomerData] = useState(null);

    // Debounce timer ref
    const searchTimeoutRef = useRef(null);

    const loadRecentCustomers = useCallback(async () => {
        try {
            const recent = await getRecentCustomers();
            setRecentCustomers(recent);
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadRecentCustomers();
    }, []);

    // Auto-refresh every 5 seconds for live data
    useEffect(() => {
        // Stop polling if user is searching or has a customer selected
        if (searchQuery.length > 0 || selectedCustomer) return;
        const intervalId = setInterval(loadRecentCustomers, 5000);
        return () => clearInterval(intervalId);
    }, [loadRecentCustomers, searchQuery, selectedCustomer]);

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

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (query.trim().length === 0) {
            setCustomers([]);
            return;
        }
        searchTimeoutRef.current = setTimeout(() => performSearch(query), 500);
    }, [performSearch]);

    const handleClearSearch = useCallback(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        setSearchQuery('');
        setCustomers([]);
    }, []);

    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        await addToRecent(customer);
        loadRecentCustomers();

        // Fetch pending orders for the selected customer
        try {
            const orders = await getCustomerRestaurantOrders(customer.customerId || customer.id);
            setPendingOrders(orders.filter(o => o.paymentMethod === 'paylater'));
        } catch (error) {
            console.error('Error fetching pending orders:', error);
        }
    };

    const handleBackToSearch = () => {
        setSelectedCustomer(null);
    };

    const handleCheckout = async (customer) => {
        if (customer.status === 'checked-out') {
            Alert.alert('Info', 'Customer is already checked out.');
            return;
        }

        setCheckoutCustomerData(customer);
        setIsCheckingOut(true);

        try {
            let history = await getCustomerFullHistory(customer.customerId || customer.id);

            // Filter history to only include orders from the current visit (after checkinTime)
            if (customer.checkinTime) {
                const checkinDate = new Date(customer.checkinTime).getTime();
                history = history.filter(order => {
                    const orderDate = new Date(order.timestamp || order.orderTime || order.createdAt).getTime();
                    return orderDate >= checkinDate;
                });
            }

            // Check for pending pay-later orders
            const pendingPayLater = history.filter(order => order.paymentMethod === 'paylater');

            if (pendingPayLater.length > 0) {
                Alert.alert(
                    'Pending Payments',
                    `This customer has ${pendingPayLater.length} unpaid 'Pay Later' order(s). Please settle them in the respective service sections before checking out.`,
                    [{ text: 'OK' }]
                );
                setIsCheckingOut(false);
                return;
            }

            // Aggregate totals by service
            const totalsByService = history.reduce((acc, order) => {
                const service = order.service || 'Other';
                if (!acc[service]) {
                    acc[service] = { amount: 0, tax: 0 };
                }
                acc[service].amount += (order.totalAmount || 0);
                acc[service].tax += (order.taxAmount || 0);
                return acc;
            }, {});

            const grandTotal = history.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            const totalTax = history.reduce((sum, order) => sum + (order.taxAmount || 0), 0);

            setInvoiceData({
                services: totalsByService,
                grandTotal,
                totalTax,
                allOrders: history,
                checkoutDate: new Date().toISOString()
            });

            setShowCheckoutModal(true);
        } catch (error) {
            console.error('Error during checkout fetching:', error);
            Alert.alert('Error', 'Failed to fetch customer history. Please try again.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const confirmCheckout = async () => {
        if (!checkoutCustomerData) return;

        try {
            setIsCheckingOut(true);
            await checkoutCustomer(checkoutCustomerData.customerId || checkoutCustomerData.id);
            setShowCheckoutModal(false);
            Alert.alert('Success', 'Customer checked out successfully!');
            loadRecentCustomers();
        } catch (error) {
            console.error('Error during checkout confirmation:', error);
            Alert.alert('Error', 'Failed to checkout customer. Please try again.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleServicePress = (service) => {
        const screenMap = {
            'games': 'Games',
            'restaurants': 'Restaurant',
            'bakery': 'Bakery',
            'juice': 'JuiceBar',
            'massage': 'Massage',
            'pool': 'Pool',
            'rooms': 'RoomsPackage',
            'theater': 'Theater',
            'functionhalls': 'FunctionHall',
            'bar': 'Bar',
        };
        const screenName = screenMap[service.id];
        if (screenName) {
            navigation.navigate(screenName, { customer: selectedCustomer });
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadRecentCustomers();
        setRefreshing(false);
    }, [loadRecentCustomers]);

    const openHistory = useCallback(() => {
        if (!selectedCustomer) return;
        navigation.navigate('CustomerHistory', { customer: selectedCustomer });
    }, [selectedCustomer, navigation]);

    const renderServicesHeader = () => (
        <>
            <SlideUp delay={100}>
                <View style={[styles.customerBanner, { backgroundColor: colors.card, borderColor: colors.brand }]}>
                    <TouchableOpacity onPress={handleBackToSearch} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.customerInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.customerName, { color: colors.textPrimary }]}>{selectedCustomer.name}</Text>
                            {selectedCustomer.isVisitor && (
                                <View style={{ backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>VISITOR</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.customerMobile, { color: colors.textSecondary }]}>{selectedCustomer.mobile}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        {pendingOrders.length > 0 && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                                onPress={() => navigation.navigate('Restaurant', { customer: selectedCustomer, openPending: true })}
                            >
                                <View style={styles.pendingBadge}>
                                    <Text style={styles.pendingBadgeText}>{pendingOrders.length}</Text>
                                </View>
                                <Icon name="clock-alert" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.historyBtn, { backgroundColor: colors.accent }]}
                            onPress={openHistory}
                        >
                            <Icon name="history" size={18} color="#FFFFFF" />
                            <Text style={styles.historyBtnText}>History</Text>
                        </TouchableOpacity>
                    </View>
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

    const renderCheckoutModal = () => {
        if (!invoiceData || !checkoutCustomerData) return (
            <Modal visible={isCheckingOut && !showCheckoutModal} transparent={true}>
                <View style={styles.fullScreenLoading}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>Preparing Invoice...</Text>
                </View>
            </Modal>
        );

        return (
            <Modal
                visible={showCheckoutModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCheckoutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.invoiceContainer, { backgroundColor: '#FFFFFF' }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.receiptHeader}>
                                <Text style={styles.receiptBrand}>SRI KALKI JAM JAM</Text>
                                <Text style={styles.receiptSubtext}>Resorts & Theme Park</Text>
                                <View style={styles.receiptDivider} />
                                <Text style={styles.receiptTitle}>FINAL INVOICE</Text>
                            </View>

                            <View style={styles.receiptSection}>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Customer:</Text>
                                    <Text style={styles.receiptValue}>{checkoutCustomerData.name}</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>ID:</Text>
                                    <Text style={styles.receiptValue}>{checkoutCustomerData.customerId || checkoutCustomerData.id}</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Check-in:</Text>
                                    <Text style={styles.receiptValue}>{formatDateTime(checkoutCustomerData.checkinTime)}</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Check-out:</Text>
                                    <Text style={styles.receiptValue}>{formatDateTime(invoiceData.checkoutDate)}</Text>
                                </View>
                            </View>

                            <View style={styles.receiptDivider} />

                            <View style={styles.receiptSection}>
                                <View style={[styles.receiptRow, styles.receiptHeaderRow]}>
                                    <Text style={styles.receiptColMain}>SERVICE</Text>
                                    <Text style={styles.receiptColAmount}>AMOUNT</Text>
                                </View>
                                {Object.entries(invoiceData.services).map(([service, data], index) => (
                                    <View key={index} style={styles.receiptRow}>
                                        <Text style={styles.receiptColMain}>{service}</Text>
                                        <Text style={styles.receiptColAmount}>₹{data.amount}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.receiptDivider} />

                            <View style={styles.receiptSection}>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Total Tax:</Text>
                                    <Text style={styles.receiptValue}>₹{invoiceData.totalTax}</Text>
                                </View>
                                <View style={[styles.receiptRow, styles.grandTotalRow]}>
                                    <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
                                    <Text style={styles.grandTotalValue}>₹{invoiceData.grandTotal}</Text>
                                </View>
                            </View>

                            <View style={styles.receiptDivider} />

                            <Text style={styles.receiptFooter}>Thank you for visiting!</Text>
                            <Text style={styles.receiptFooterSmall}>Please show this receipt at the exit gate.</Text>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setShowCheckoutModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.confirmBtn]}
                                onPress={confirmCheckout}
                                disabled={isCheckingOut}
                            >
                                {isCheckingOut ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Icon name="check-circle" size={18} color="#FFFFFF" />
                                        <Text style={styles.confirmBtnText}>Confirm</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderServiceItem = ({ item: service, index }) => (
        <StaggerItem index={index} delay={80} style={styles.serviceGridItem}>
            <ServiceCard service={service} onPress={handleServicePress} />
        </StaggerItem>
    );

    const renderListHeader = () => (
        <View>
            <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                    style={[styles.actionButtonMain, { backgroundColor: colors.accent }]}
                    onPress={() => navigation.navigate('NewCustomer')}
                    activeOpacity={0.8}
                >
                    <Icon name="account-plus" size={20} color={colors.textOnAccent} />
                    <Text style={[styles.actionButtonText, { color: colors.textOnAccent }]}>New Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButtonMain, { backgroundColor: '#4B5563' }]}
                    onPress={() => navigation.navigate('CheckedOutHistory')}
                    activeOpacity={0.8}
                >
                    <Icon name="history" size={20} color="#FFFFFF" />
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>History</Text>
                </TouchableOpacity>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {searchQuery.length > 0 ? `Search Results (${customers.length})` : 'Recent Customers'}
            </Text>
        </View>
    );

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
        </View>
    );

    if (selectedCustomer) {
        const numColumns = isTabletLocal ? 4 : 2;
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
                {renderCheckoutModal()}
            </View>
        );
    }

    const displayData = searchQuery.length > 0 ? customers : recentCustomers;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header subtitle="Your Resort Companion" showTypewriter={searchQuery.length === 0} />
            <SearchBar
                onSearch={handleSearch}
                onClear={handleClearSearch}
                placeholder="Search customer by name or mobile..."
            />
            <FlatList
                data={displayData}
                keyExtractor={(item) => item.customerId || item.id}
                renderItem={({ item }) => (
                    <CustomerCard
                        customer={item}
                        onPress={handleSelectCustomer}
                        showCheckout={searchQuery.length === 0}
                        onCheckout={handleCheckout}
                    />
                )}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
                }
            />
            {renderCheckoutModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingGrow: 1, paddingBottom: 100, paddingHorizontal: 8 },
    columnWrapper: { justifyContent: 'flex-start' },
    serviceGridItem: { width: isTablet ? '25%' : '50%', padding: 6 },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 8,
        marginBottom: 16,
    },
    actionButtonMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 2,
    },
    actionButtonText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginHorizontal: 8, marginTop: 12, marginBottom: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 16, marginTop: 12 },
    customerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
        marginVertical: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    backButton: { padding: 8, marginRight: 12 },
    customerInfo: { flex: 1 },
    customerName: { fontSize: 18, fontWeight: '600' },
    customerMobile: { fontSize: 14, marginTop: 2 },
    historyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    historyBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginLeft: 4 },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F59E0B',
        zIndex: 1,
    },
    pendingBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    invoiceContainer: {
        width: '100%',
        maxWidth: 400,
        maxHeight: '85%',
        borderRadius: 20,
        padding: 20,
        elevation: 10,
    },
    receiptHeader: {
        alignItems: 'center',
        marginBottom: 15,
    },
    receiptBrand: {
        fontSize: 22,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: 1,
    },
    receiptSubtext: {
        fontSize: 12,
        color: '#333333',
        marginBottom: 10,
    },
    receiptDivider: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        borderStyle: 'dashed',
        marginVertical: 12,
    },
    receiptTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000000',
        textDecorationLine: 'underline',
    },
    receiptSection: {
        marginBottom: 5,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    receiptLabel: {
        fontSize: 13,
        color: '#333333',
        fontWeight: '500',
    },
    receiptValue: {
        fontSize: 13,
        color: '#000000',
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
        marginLeft: 10,
    },
    receiptHeaderRow: {
        marginBottom: 10,
    },
    receiptColMain: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000000',
        flex: 1,
    },
    receiptColAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000000',
        width: 80,
        textAlign: 'right',
    },
    grandTotalRow: {
        marginTop: 5,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#000000',
    },
    grandTotalLabel: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000000',
    },
    grandTotalValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000000',
    },
    receiptFooter: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '700',
        color: '#000000',
        marginTop: 10,
    },
    receiptFooterSmall: {
        textAlign: 'center',
        fontSize: 11,
        color: '#333333',
        marginTop: 4,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    modalBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    cancelBtn: {
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    confirmBtn: {
        backgroundColor: '#10B981',
    },
    cancelBtnText: {
        color: '#4B5563',
        fontWeight: '600',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    fullScreenLoading: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default HomeScreen;
