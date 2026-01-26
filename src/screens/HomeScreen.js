import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import CustomerCard from '../components/CustomerCard';
import ServiceCard, { SERVICES } from '../components/ServiceCard';
import BannerCarousel from '../components/BannerCarousel';
import { useTheme } from '../context/ThemeContext';
import { getRecentCustomers, searchCustomers, addToRecent } from '../utils/api';
import { FadeIn, SlideUp, StaggerItem } from '../utils/animations';

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
        if (searchQuery.length > 0) return;
        const intervalId = setInterval(loadRecentCustomers, 5000);
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
    };

    const handleBackToSearch = () => {
        setSelectedCustomer(null);
    };

    const handleServicePress = (service) => {
        const screenMap = {
            'games': 'Games',
            'restaurants': 'Restaurant',
            'bakery': 'Bakery',
            'juice': 'JuiceBar',
            'massage': 'Massage',
            'pool': 'Pool',
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

    const renderServiceItem = ({ item: service, index }) => (
        <StaggerItem index={index} delay={80} style={styles.serviceGridItem}>
            <ServiceCard service={service} onPress={handleServicePress} />
        </StaggerItem>
    );

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
                renderItem={({ item }) => <CustomerCard customer={item} onPress={handleSelectCustomer} />}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { paddingGrow: 1, paddingBottom: 100, paddingHorizontal: 8 },
    columnWrapper: { justifyContent: 'flex-start' },
    serviceGridItem: { width: isTablet ? '25%' : '50%', padding: 6 },
    newBookingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
        marginBottom: 16,
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 2,
    },
    newBookingText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
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
});

export default HomeScreen;
