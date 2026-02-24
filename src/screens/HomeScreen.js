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
    formatDateTime,
    getNextBillNumber
} from '../utils/api';
import {
    RESORT_DETAILS,
    numberToWords,
    formatBillDate,
    formatBillTime,
    generateBillNo
} from '../utils/billUtils';
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

    const loadRecentCustomers = useCallback(async (options = {}) => {
        try {
            const recent = await getRecentCustomers(options);
            setRecentCustomers(recent);
        } catch (error) {
            if (!error.isAborted) {
                console.error('Error loading customers:', error);
            }
        }
    }, []);

    // Initial load and recursive polling
    useEffect(() => {
        const controller = new AbortController();
        let timeoutId;

        const poll = async () => {
            // Stop polling if user is searching or has a customer selected
            if (searchQuery.length > 0 || selectedCustomer) {
                timeoutId = setTimeout(poll, 2000); // Check again soon
                return;
            }

            await loadRecentCustomers({ signal: controller.signal });

            // Schedule next poll ONLY after the previous one finishes
            if (!controller.signal.aborted) {
                timeoutId = setTimeout(poll, 5000);
            }
        };

        poll();

        return () => {
            controller.abort();
            clearTimeout(timeoutId);
        };
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

            // Split into General and Bar
            const barData = totalsByService['Bar'];
            const generalServices = { ...totalsByService };
            delete generalServices['Bar'];

            const hasBar = !!barData;
            const hasGeneral = Object.keys(generalServices).length > 0;

            let invoiceInfo = {
                checkoutDate: new Date().toISOString(),
                allOrders: history,
            };

            if (hasGeneral) {
                const generalTotal = Object.values(generalServices).reduce((sum, s) => sum + s.amount, 0);
                const generalTax = Object.values(generalServices).reduce((sum, s) => sum + s.tax, 0);
                const billNo = await getNextBillNumber('R');
                invoiceInfo.generalInvoice = {
                    services: generalServices,
                    grandTotal: generalTotal,
                    totalTax: generalTax,
                    billNo
                };
            }

            if (hasBar) {
                const billNo = await getNextBillNumber('B');
                invoiceInfo.barInvoice = {
                    services: { 'Bar': barData },
                    grandTotal: barData.amount,
                    totalTax: barData.tax,
                    billNo
                };
            }

            setInvoiceData(invoiceInfo);
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

        const renderSingleBill = (invoice, title) => (
            <View style={{ marginBottom: 30 }}>
                {title && <Text style={[styles.billServiceTitle, { color: colors.brand, fontWeight: '900', textAlign: 'center', marginBottom: 10, fontSize: 18, textDecorationLine: 'underline' }]}>{title}</Text>}

                <View style={styles.billMetaRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.billMetaLabel}>B.No: <Text style={styles.billMetaValue}>{invoice.billNo}</Text></Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.billMetaLabel}>Date: <Text style={styles.billMetaValue}>{formatBillDate(invoiceData.checkoutDate)}</Text></Text>
                        <Text style={styles.billMetaLabel}>Time: <Text style={styles.billMetaValue}>{formatBillTime(invoiceData.checkoutDate)}</Text></Text>
                    </View>
                </View>

                <View style={styles.billInfoRow}>
                    <Text style={styles.billInfoLabel}>To  : <Text style={styles.billInfoValue}>{checkoutCustomerData.name}</Text></Text>
                    {checkoutCustomerData.roomNo && (
                        <Text style={styles.billInfoValue}>Room No: {checkoutCustomerData.roomNo}</Text>
                    )}
                    <Text style={styles.billInfoValue}>State Name: {RESORT_DETAILS.state}</Text>
                    <Text style={styles.billInfoValue}>State Code: {RESORT_DETAILS.stateCode}</Text>
                </View>

                <View style={styles.billDividerDashed} />

                <View style={styles.billTable}>
                    <View style={styles.billTableHeader}>
                        <Text style={[styles.billCol, { flex: 3 }]}>ITEM NAME</Text>
                        <Text style={[styles.billCol, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                        <Text style={[styles.billCol, { flex: 1, textAlign: 'right' }]}>RATE</Text>
                        <Text style={[styles.billCol, { flex: 1.5, textAlign: 'right' }]}>AMOUNT</Text>
                    </View>

                    <View style={styles.billDividerDashed} />

                    {Object.entries(invoice.services).map(([service, data], index) => (
                        <View key={index} style={styles.billTableRow}>
                            <Text style={[styles.billColContent, { flex: 3 }]}>{service} Service</Text>
                            <Text style={[styles.billColContent, { flex: 1, textAlign: 'center' }]}>1</Text>
                            <Text style={[styles.billColContent, { flex: 1, textAlign: 'right' }]}>{data.amount - data.tax}</Text>
                            <Text style={[styles.billColContent, { flex: 1.5, textAlign: 'right' }]}>{(data.amount - data.tax).toFixed(2)}</Text>
                        </View>
                    ))}

                    {invoice.totalTax > 0 && (
                        <View style={styles.billTableRow}>
                            <Text style={[styles.billColContent, { flex: 4 }]}>Service Tax / GST</Text>
                            <Text style={[styles.billColContent, { flex: 1.5, textAlign: 'right' }]}>{invoice.totalTax.toFixed(2)}</Text>
                        </View>
                    )}

                    <View style={styles.billDividerDashed} />

                    <View style={styles.billTotalRow}>
                        <Text style={styles.billTotalQty}>{Object.keys(invoice.services).length + (invoice.totalTax > 0 ? 1 : 0)} Items</Text>
                        <Text style={styles.billTotalValue}>{invoice.grandTotal.toFixed(2)}</Text>
                    </View>

                    <View style={styles.billDividerDashed} />

                    <View style={styles.billFinalTotalRow}>
                        <Text style={styles.billFinalTotalLabel}>TOTAL AMT  :</Text>
                        <Text style={styles.billFinalTotalValue}>{invoice.grandTotal.toFixed(2)}</Text>
                    </View>

                    <Text style={styles.billAmtInWords}>
                        {numberToWords(invoice.grandTotal)}
                    </Text>

                    <View style={styles.billFooterSign}>
                        <View style={styles.billDividerDashed} />
                        <Text style={styles.billFooterText}>For {RESORT_DETAILS.name}</Text>
                    </View>
                </View>
                {invoiceData.generalInvoice && invoiceData.barInvoice && invoice === invoiceData.generalInvoice && (
                    <View style={{ marginVertical: 20, height: 2, backgroundColor: '#000', borderStyle: 'dashed', borderRadius: 1 }} />
                )}
            </View>
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
                                <Text style={styles.billHeadName}>{RESORT_DETAILS.name}</Text>
                                <Text style={styles.billHeadAddr}>{RESORT_DETAILS.address}</Text>
                                <Text style={styles.billHeadOther}>GSTIN : {RESORT_DETAILS.gstin}</Text>
                                <Text style={styles.billHeadOther}>Mobile : {RESORT_DETAILS.mobile}</Text>
                                <Text style={styles.billHeadOther}>Email : {RESORT_DETAILS.email}</Text>
                                <Text style={styles.billHeadOther}>Website : {RESORT_DETAILS.website}</Text>
                                <View style={styles.billDividerDashed} />
                            </View>

                            {invoiceData.generalInvoice && renderSingleBill(invoiceData.generalInvoice, invoiceData.barInvoice ? "GENERAL BILL" : null)}
                            {invoiceData.barInvoice && renderSingleBill(invoiceData.barInvoice, invoiceData.generalInvoice ? "BAR BILL" : null)}
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
        marginBottom: 10,
    },
    billHeadName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000000',
        textAlign: 'center',
        marginBottom: 2,
    },
    billHeadAddr: {
        fontSize: 11,
        color: '#333333',
        textAlign: 'center',
        paddingHorizontal: 10,
        marginBottom: 4,
        fontWeight: '600',
    },
    billHeadOther: {
        fontSize: 11,
        color: '#333333',
        textAlign: 'center',
        fontWeight: '600',
    },
    billDividerDashed: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        borderStyle: 'dashed',
        marginVertical: 10,
    },
    billMetaRow: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 10,
    },
    billMetaLabel: {
        fontSize: 11,
        color: '#333333',
        fontWeight: '800',
    },
    billMetaValue: {
        fontSize: 11,
        color: '#000000',
        fontWeight: '600',
    },
    billInfoRow: {
        width: '100%',
        alignItems: 'flex-start',
        gap: 2,
    },
    billInfoLabel: {
        fontSize: 12,
        color: '#333333',
        fontWeight: '800',
    },
    billInfoValue: {
        fontSize: 12,
        color: '#000000',
        fontWeight: '800',
    },
    billTable: {
        width: '100%',
    },
    billTableHeader: {
        flexDirection: 'row',
        width: '100%',
    },
    billCol: {
        fontSize: 11,
        fontWeight: '900',
        color: '#000000',
    },
    billTableRow: {
        flexDirection: 'row',
        width: '100%',
        minHeight: 24,
        alignItems: 'center',
    },
    billColContent: {
        fontSize: 11,
        fontWeight: '700',
        color: '#000000',
    },
    billTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: '20%',
    },
    billTotalQty: {
        fontSize: 12,
        fontWeight: '900',
        color: '#000000',
    },
    billTotalValue: {
        fontSize: 12,
        fontWeight: '900',
        color: '#000000',
    },
    billFinalTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    billFinalTotalLabel: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000000',
    },
    billFinalTotalValue: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000000',
    },
    billAmtInWords: {
        fontSize: 12,
        fontWeight: '800',
        color: '#000000',
        textAlign: 'center',
        marginTop: 5,
        fontStyle: 'italic',
    },
    billFooterSign: {
        marginTop: 20,
        alignItems: 'center',
    },
    billFooterText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#000000',
        marginTop: 10,
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
