import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    Alert,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';
import {
    getGames,
    getPoolTypes,
    getMassageItems,
    getMenuItems,
    getBakeryItems,
    getJuiceItems,
    getCombos,
    addCombo,
    updateCombo,
    deleteCombo,
    saveBooking,
    searchCustomers,
    UPI_ID,
    getUPIString,
} from '../utils/api';

// Safe Dimensions access with fallback
let isTablet = false;
let screenWidth = 375;
try {
    const dimWidth = Dimensions.get('window').width;
    isTablet = dimWidth >= 768;
    screenWidth = dimWidth;
} catch (error) {
    console.warn('Dimensions not available during ComboScreen initialization');
}

// Service definitions with API fetch functions
const SERVICE_CONFIG = {
    games: {
        name: 'Games',
        icon: 'gamepad-variant',
        color: '#EF4444',
        type: 'packages',
        fetchItems: getGames,
    },
    pool: {
        name: 'Swimming Pool',
        icon: 'pool',
        color: '#3B82F6',
        type: 'packages',
        fetchItems: getPoolTypes,
    },
    massage: {
        name: 'Massage',
        icon: 'spa',
        color: '#10B981',
        type: 'packages',
        fetchItems: getMassageItems,
    },
    restaurant: {
        name: 'Restaurant',
        icon: 'silverware-fork-knife',
        color: '#F59E0B',
        type: 'packages',
        fetchItems: getMenuItems,
    },
    bakery: {
        name: 'Bakery',
        icon: 'cupcake',
        color: '#EC4899',
        type: 'packages',
        fetchItems: getBakeryItems,
    },
    juice: {
        name: 'Juice Bar',
        icon: 'cup',
        color: '#8B5CF6',
        type: 'packages',
        fetchItems: getJuiceItems,
    },
};

const ComboScreen = () => {
    const { colors, isDarkMode } = useTheme();
    const [combos, setCombos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCombo, setEditingCombo] = useState(null);

    // Create/Edit form state
    const [comboName, setComboName] = useState('');
    const [comboDescription, setComboDescription] = useState('');
    const [comboPrice, setComboPrice] = useState('');
    const [selectedItems, setSelectedItems] = useState({});

    // Service selection modal state
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [currentService, setCurrentService] = useState(null);
    const [serviceItems, setServiceItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

    // Sell combo states
    const [showSellModal, setShowSellModal] = useState(false);
    const [sellingCombo, setSellingCombo] = useState(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // Load combos from database
    useEffect(() => {
        loadCombos();
    }, []);

    const loadCombos = async () => {
        setIsLoading(true);
        try {
            const dbCombos = await getCombos();
            setCombos(dbCombos);
        } catch (error) {
            console.error('Error loading combos:', error);
            Alert.alert('Error', 'Could not load combos');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCombos();
    };

    const calculateOriginalPrice = () => {
        let total = 0;
        Object.entries(selectedItems).forEach(([serviceId, data]) => {
            if (data.items) {
                data.items.forEach(item => {
                    total += item.rate || item.price || item.comboPrice || 0;
                });
            }
        });
        return total;
    };

    const resetForm = () => {
        setComboName('');
        setComboDescription('');
        setComboPrice('');
        setSelectedItems({});
        setEditingCombo(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowCreateModal(true);
    };

    const openEditModal = (combo) => {
        setEditingCombo(combo);
        setComboName(combo.name);
        setComboDescription(combo.description || '');
        setComboPrice(combo.comboPrice?.toString() || '');
        setSelectedItems(combo.items || {});
        setShowCreateModal(true);
    };

    // Open service selection modal
    const openServiceModal = async (serviceId) => {
        const config = SERVICE_CONFIG[serviceId];
        setCurrentService({ id: serviceId, ...config });
        setShowServiceModal(true);
        setLoadingItems(true);

        try {
            const items = await config.fetchItems();
            setServiceItems(items);
        } catch (error) {
            console.error(`Error fetching ${serviceId} items:`, error);
            setServiceItems([]);
        } finally {
            setLoadingItems(false);
        }
    };

    // Toggle package selection
    const togglePackageSelection = (item) => {
        const serviceId = currentService.id;
        setSelectedItems(prev => {
            const currentItems = prev[serviceId]?.items || [];
            const isSelected = currentItems.some(i => i.id === item.id);

            if (isSelected) {
                const newItems = currentItems.filter(i => i.id !== item.id);
                if (newItems.length === 0) {
                    const { [serviceId]: removed, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [serviceId]: { items: newItems } };
            } else {
                return {
                    ...prev,
                    [serviceId]: { items: [...currentItems, item] },
                };
            }
        });
    };

    const isItemSelected = (item) => {
        if (!currentService) return false;
        const serviceId = currentService.id;
        return selectedItems[serviceId]?.items?.some(i => i.id === item.id) || false;
    };

    const removeService = (serviceId) => {
        setSelectedItems(prev => {
            const { [serviceId]: removed, ...rest } = prev;
            return rest;
        });
    };

    // Save combo to database
    const handleSaveCombo = async () => {
        if (!comboName.trim()) {
            Alert.alert('Error', 'Please enter a combo name');
            return;
        }
        if (Object.keys(selectedItems).length < 2) {
            Alert.alert('Error', 'Please select at least 2 services');
            return;
        }
        if (!comboPrice.trim() || isNaN(Number(comboPrice))) {
            Alert.alert('Error', 'Please enter a valid combo price');
            return;
        }

        const originalPrice = calculateOriginalPrice();
        const comboData = {
            name: comboName.trim(),
            description: comboDescription.trim(),
            items: selectedItems,
            originalPrice,
            comboPrice: Number(comboPrice),
            isActive: true,
        };

        try {
            if (editingCombo) {
                await updateCombo(editingCombo.id, comboData);
                Alert.alert('Success', 'Combo updated!');
            } else {
                await addCombo(comboData);
                Alert.alert('Success', 'Combo created!');
            }
            setShowCreateModal(false);
            resetForm();
            loadCombos();
        } catch (error) {
            console.error('Error saving combo:', error);
            Alert.alert('Error', 'Could not save combo');
        }
    };

    // Delete combo from database
    const handleDeleteCombo = (comboId) => {
        Alert.alert('Delete Combo', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteCombo(comboId);
                        loadCombos();
                    } catch (error) {
                        Alert.alert('Error', 'Could not delete combo');
                    }
                },
            },
        ]);
    };

    // Toggle combo active status
    const toggleComboStatus = async (combo) => {
        try {
            await updateCombo(combo.id, { isActive: !combo.isActive });
            loadCombos();
        } catch (error) {
            Alert.alert('Error', 'Could not update status');
        }
    };

    // ===== SELL COMBO FLOW =====
    const openSellModal = (combo) => {
        setSellingCombo(combo);
        setSelectedCustomer(null);
        setCustomerSearch('');
        setSearchResults([]);
        setShowSellModal(true);
    };

    // Search customers
    const handleSearchCustomer = useCallback(async (query) => {
        setCustomerSearch(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchCustomers(query);
            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const selectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setSearchResults([]);
        setCustomerSearch(customer.name);
    };

    const proceedToPayment = () => {
        if (!selectedCustomer) {
            Alert.alert('Error', 'Please select a customer');
            return;
        }
        setShowSellModal(false);
        setShowPaymentModal(true);
    };

    // Handle payment and save booking
    const handlePayment = async (paymentMethod) => {
        if (!sellingCombo || !selectedCustomer) return;

        setSelectedPaymentMethod(paymentMethod);

        // For UPI, just show QR - actual confirmation handled separately
        if (paymentMethod === 'UPI') {
            return;
        }

        await completeBooking(paymentMethod);
    };

    const completeBooking = async (paymentMethod) => {
        try {
            // Create booking items from combo services
            const bookingItems = [];
            Object.entries(sellingCombo.items || {}).forEach(([serviceId, data]) => {
                const config = SERVICE_CONFIG[serviceId];
                if (data.items) {
                    data.items.forEach(item => {
                        bookingItems.push({
                            service: config?.name || serviceId,
                            itemName: item.name,
                            price: item.rate || item.price || item.comboPrice || 0,
                        });
                    });
                }
            });

            console.log('Combo booking - Selected customer:', JSON.stringify(selectedCustomer, null, 2));
            const actualCustomerId = selectedCustomer.customerId || selectedCustomer.id;
            console.log('Combo booking - Using customerId:', actualCustomerId);

            if (!actualCustomerId) {
                console.warn('Combo booking - No customerId found! Customer object:', selectedCustomer);
            }

            await saveBooking({
                customerId: actualCustomerId,
                customerName: selectedCustomer.name,
                customerMobile: selectedCustomer.mobile || '',
                items: bookingItems,
                subtotal: sellingCombo.originalPrice,
                comboDiscount: sellingCombo.originalPrice - sellingCombo.comboPrice,
                totalAmount: sellingCombo.comboPrice,
                paymentMethod: paymentMethod,
                service: 'Combo',
                comboName: sellingCombo.name,
                comboId: sellingCombo.id,
            });

            Alert.alert(
                'Success!',
                `Combo "${sellingCombo.name}" sold to ${selectedCustomer.name} for ₹${sellingCombo.comboPrice}`,
                [{
                    text: 'Done',
                    onPress: () => {
                        setShowPaymentModal(false);
                        setSellingCombo(null);
                        setSelectedCustomer(null);
                        setSelectedPaymentMethod(null);
                    }
                }]
            );
        } catch (error) {
            console.error('Error saving booking:', error);
            Alert.alert('Error', 'Could not complete booking');
        }
    };

    // ===== RENDER FUNCTIONS =====

    const renderComboCard = ({ item: combo }) => {
        const savings = combo.originalPrice - combo.comboPrice;
        const savingsPercent = combo.originalPrice > 0 ? Math.round((savings / combo.originalPrice) * 100) : 0;

        return (
            <View style={[styles.comboCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.comboHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.comboName, { color: colors.text }]}>{combo.name}</Text>
                        <Text style={[styles.comboDescription, { color: colors.textSecondary }]}>
                            {combo.description}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: combo.isActive ? '#10B981' : '#6B7280' }]}
                        onPress={() => toggleComboStatus(combo)}
                    >
                        <Text style={styles.statusText}>{combo.isActive ? 'Active' : 'Inactive'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.servicesRow}>
                    {Object.entries(combo.items || {}).map(([serviceId, data]) => {
                        const config = SERVICE_CONFIG[serviceId];
                        if (!config) return null;
                        return (
                            <View
                                key={serviceId}
                                style={[styles.serviceChip, { backgroundColor: config.color + '20' }]}
                            >
                                <Icon name={config.icon} size={14} color={config.color} />
                                <Text style={[styles.serviceChipText, { color: config.color }]}>
                                    {config.name}
                                    {data.items?.length ? ` (${data.items.length})` : ''}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.pricingRow}>
                    <View>
                        <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                            Original: ₹{combo.originalPrice}
                        </Text>
                        <Text style={[styles.comboPrice, { color: colors.brand }]}>
                            Combo: ₹{combo.comboPrice}
                        </Text>
                    </View>
                    {savingsPercent > 0 && (
                        <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>Save {savingsPercent}%</Text>
                        </View>
                    )}
                </View>

                <View style={styles.actionRow}>
                    {combo.isActive && (
                        <TouchableOpacity
                            style={[styles.sellBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => openSellModal(combo)}
                        >
                            <Icon name="cart" size={18} color="#FFFFFF" />
                            <Text style={styles.sellBtnText}>Sell</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.brand + '20' }]}
                        onPress={() => openEditModal(combo)}
                    >
                        <Icon name="pencil" size={18} color={colors.brand} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}
                        onPress={() => handleDeleteCombo(combo.id)}
                    >
                        <Icon name="delete" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Sell Modal
    const renderSellModal = () => (
        <Modal
            visible={showSellModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowSellModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.sellModalContent, { backgroundColor: colors.card }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            Sell: {sellingCombo?.name}
                        </Text>
                        <TouchableOpacity onPress={() => setShowSellModal(false)}>
                            <Icon name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sellModalBody}>
                        <Text style={[styles.inputLabel, { color: colors.text }]}>Search Customer</Text>
                        <TextInput
                            style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                            placeholder="Enter name or mobile..."
                            placeholderTextColor={colors.textSecondary}
                            value={customerSearch}
                            onChangeText={handleSearchCustomer}
                        />

                        {isSearching && (
                            <ActivityIndicator style={{ marginVertical: 10 }} color={colors.brand} />
                        )}

                        {searchResults.length > 0 && (
                            <View style={[styles.searchResults, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                {searchResults.slice(0, 5).map((customer, index) => (
                                    <TouchableOpacity
                                        key={customer.customerId || customer.id || `customer-${index}`}
                                        style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                                        onPress={() => selectCustomer(customer)}
                                    >
                                        <Icon name="account" size={20} color={colors.brand} />
                                        <View style={{ marginLeft: 10, flex: 1 }}>
                                            <Text style={[styles.customerName, { color: colors.text }]}>{customer.name}</Text>
                                            <Text style={[styles.customerMobile, { color: colors.textSecondary }]}>{customer.mobile}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {selectedCustomer && (
                            <View style={[styles.selectedCustomerCard, { backgroundColor: colors.brand + '15', borderColor: colors.brand }]}>
                                <Icon name="account-check" size={24} color={colors.brand} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.selectedCustomerName, { color: colors.text }]}>
                                        {selectedCustomer.name}
                                    </Text>
                                    <Text style={[styles.selectedCustomerMobile, { color: colors.textSecondary }]}>
                                        {selectedCustomer.mobile}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                                    <Icon name="close-circle" size={24} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={[styles.comboPriceSummary, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Original:</Text>
                                <Text style={[styles.priceValue, { color: colors.textSecondary, textDecorationLine: 'line-through' }]}>
                                    ₹{sellingCombo?.originalPrice}
                                </Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceLabel, { color: colors.text, fontWeight: '700' }]}>Combo Price:</Text>
                                <Text style={[styles.priceValue, { color: colors.brand, fontWeight: '800', fontSize: 24 }]}>
                                    ₹{sellingCombo?.comboPrice}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.proceedBtn, { backgroundColor: selectedCustomer ? '#10B981' : '#6B7280' }]}
                        onPress={proceedToPayment}
                        disabled={!selectedCustomer}
                    >
                        <Icon name="arrow-right" size={20} color="#FFFFFF" />
                        <Text style={styles.proceedBtnText}>Proceed to Payment</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Payment Modal
    const renderPaymentModal = () => (
        <Modal
            visible={showPaymentModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowPaymentModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.paymentModalContent, { backgroundColor: colors.card }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Payment</Text>
                        <TouchableOpacity onPress={() => {
                            setShowPaymentModal(false);
                            setSelectedPaymentMethod(null);
                        }}>
                            <Icon name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.paymentBody}>
                        <Text style={[styles.paymentAmount, { color: colors.text }]}>
                            ₹{sellingCombo?.comboPrice}
                        </Text>
                        <Text style={[styles.paymentCustomer, { color: colors.textSecondary }]}>
                            for {selectedCustomer?.name}
                        </Text>

                        {!selectedPaymentMethod ? (
                            <View style={styles.paymentMethods}>
                                <TouchableOpacity
                                    style={[styles.paymentMethodBtn, { backgroundColor: '#10B981' }]}
                                    onPress={() => handlePayment('Cash')}
                                >
                                    <Icon name="cash" size={28} color="#FFFFFF" />
                                    <Text style={styles.paymentMethodText}>Cash</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.paymentMethodBtn, { backgroundColor: '#3B82F6' }]}
                                    onPress={() => handlePayment('UPI')}
                                >
                                    <Icon name="qrcode" size={28} color="#FFFFFF" />
                                    <Text style={styles.paymentMethodText}>UPI</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.paymentMethodBtn, { backgroundColor: '#F59E0B' }]}
                                    onPress={() => handlePayment('Pay Later')}
                                >
                                    <Icon name="clock-outline" size={28} color="#FFFFFF" />
                                    <Text style={styles.paymentMethodText}>Pay Later</Text>
                                </TouchableOpacity>
                            </View>
                        ) : selectedPaymentMethod === 'UPI' ? (
                            <View style={styles.qrContainer}>
                                <View style={styles.qrCodeWrapper}>
                                    <QRCode
                                        value={getUPIString(sellingCombo?.comboPrice || 0)}
                                        size={180}
                                        backgroundColor="#FFFFFF"
                                    />
                                </View>
                                <Text style={[styles.qrHint, { color: colors.textSecondary }]}>
                                    Scan to pay ₹{sellingCombo?.comboPrice}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.confirmPaymentBtn, { backgroundColor: '#10B981' }]}
                                    onPress={() => completeBooking('UPI')}
                                >
                                    <Icon name="check" size={20} color="#FFFFFF" />
                                    <Text style={styles.confirmPaymentText}>Payment Received</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Service selection modal
    const renderServiceModal = () => {
        if (!currentService) return null;

        return (
            <Modal
                visible={showServiceModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowServiceModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.serviceModalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Icon name={currentService.icon} size={24} color={currentService.color} />
                                <Text style={[styles.modalTitle, { color: colors.text }]}>
                                    {currentService.name}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                                <Icon name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flex: 1 }}>
                            {loadingItems ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={currentService.color} />
                                </View>
                            ) : serviceItems.length === 0 ? (
                                <View style={styles.emptyPackages}>
                                    <Icon name="package-variant" size={48} color={colors.textSecondary} />
                                    <Text style={[styles.emptyPackagesText, { color: colors.textSecondary }]}>
                                        No packages found
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={serviceItems}
                                    keyExtractor={(item) => item.id || item.itemId || item.typeId}
                                    contentContainerStyle={{ padding: 16 }}
                                    renderItem={({ item }) => {
                                        const selected = isItemSelected(item);
                                        const price = item.rate || item.price || item.comboPrice || 0;
                                        const isGame = currentService.id === 'games';
                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.packageItem,
                                                    { backgroundColor: colors.background, borderColor: selected ? currentService.color : colors.border },
                                                    selected && { backgroundColor: currentService.color + '10' },
                                                ]}
                                                onPress={() => togglePackageSelection(item)}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.packageName, { color: colors.text }]}>
                                                        {item.name}
                                                    </Text>
                                                    {isGame ? (
                                                        <View style={styles.gameDetails}>
                                                            {item.coins && item.coins !== '-' && (
                                                                <View style={styles.gameDetailBadge}>
                                                                    <Icon name="circle-multiple" size={12} color="#F59E0B" />
                                                                    <Text style={[styles.gameDetailText, { color: colors.textSecondary }]}>
                                                                        {item.coins} coins
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            {item.minutes && (
                                                                <View style={styles.gameDetailBadge}>
                                                                    <Icon name="clock-outline" size={12} color="#3B82F6" />
                                                                    <Text style={[styles.gameDetailText, { color: colors.textSecondary }]}>
                                                                        {item.minutes} min
                                                                    </Text>
                                                                </View>
                                                            )}
                                                            {price > 0 && (
                                                                <View style={styles.gameDetailBadge}>
                                                                    <Icon name="currency-inr" size={12} color="#10B981" />
                                                                    <Text style={[styles.gameDetailText, { color: '#10B981', fontWeight: '600' }]}>
                                                                        ₹{price}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    ) : (
                                                        item.description && (
                                                            <Text style={[styles.packageDesc, { color: colors.textSecondary }]}>
                                                                {item.description}
                                                            </Text>
                                                        )
                                                    )}
                                                </View>
                                                <Text style={[styles.packagePrice, { color: currentService.color }]}>
                                                    ₹{price}
                                                </Text>
                                                {selected && (
                                                    <View style={[styles.checkMark, { backgroundColor: currentService.color }]}>
                                                        <Icon name="check" size={14} color="#FFFFFF" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}
                            <TouchableOpacity
                                style={[styles.doneBtn, { backgroundColor: currentService.color }]}
                                onPress={() => setShowServiceModal(false)}
                            >
                                <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    // Create/Edit modal
    const renderCreateModal = () => {
        const originalPrice = calculateOriginalPrice();
        const savings = comboPrice ? originalPrice - Number(comboPrice) : 0;

        return (
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingCombo ? 'Edit Combo' : 'Create New Combo'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Icon name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Combo Name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g., Family Fun Pack"
                                placeholderTextColor={colors.textSecondary}
                                value={comboName}
                                onChangeText={setComboName}
                            />

                            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="Describe what's included..."
                                placeholderTextColor={colors.textSecondary}
                                value={comboDescription}
                                onChangeText={setComboDescription}
                                multiline
                                numberOfLines={2}
                            />

                            <Text style={[styles.inputLabel, { color: colors.text }]}>
                                Select Services (tap to configure)
                            </Text>
                            <View style={styles.servicesGrid}>
                                {Object.entries(SERVICE_CONFIG).map(([serviceId, config]) => {
                                    const isAdded = !!selectedItems[serviceId];
                                    return (
                                        <TouchableOpacity
                                            key={serviceId}
                                            style={[
                                                styles.serviceOption,
                                                { backgroundColor: colors.background, borderColor: isAdded ? config.color : colors.border },
                                                isAdded && { backgroundColor: config.color + '15' },
                                            ]}
                                            onPress={() => openServiceModal(serviceId)}
                                        >
                                            <Icon name={config.icon} size={28} color={config.color} />
                                            <Text style={[styles.serviceOptionName, { color: colors.text }]}>{config.name}</Text>
                                            {isAdded && (
                                                <>
                                                    <Text style={[styles.serviceAdded, { color: config.color }]}>
                                                        {`${selectedItems[serviceId].items?.length || 0} items`}
                                                    </Text>
                                                    <TouchableOpacity
                                                        style={styles.removeServiceBtn}
                                                        onPress={() => removeService(serviceId)}
                                                    >
                                                        <Icon name="close-circle" size={20} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                            {isAdded && (
                                                <View style={[styles.checkMark, { backgroundColor: config.color, position: 'absolute', top: 6, right: 6 }]}>
                                                    <Icon name="check" size={12} color="#FFFFFF" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {Object.keys(selectedItems).length >= 2 && (
                                <View style={[styles.pricingSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <View style={styles.pricingRowModal}>
                                        <Text style={[styles.pricingLabel, { color: colors.textSecondary }]}>Original Total:</Text>
                                        <Text style={[styles.pricingValue, { color: colors.text }]}>₹{originalPrice}</Text>
                                    </View>
                                    <View style={styles.pricingRowModal}>
                                        <Text style={[styles.pricingLabel, { color: colors.text, fontWeight: '600' }]}>Combo Price:</Text>
                                        <TextInput
                                            style={[styles.priceInput, { backgroundColor: colors.card, color: colors.brand, borderColor: colors.brand }]}
                                            placeholder="₹"
                                            placeholderTextColor={colors.textSecondary}
                                            value={comboPrice}
                                            onChangeText={setComboPrice}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    {savings > 0 && (
                                        <View style={styles.savingsPreview}>
                                            <Icon name="tag" size={16} color="#10B981" />
                                            <Text style={styles.savingsPreviewText}>
                                                Customer saves ₹{savings} ({Math.round((savings / originalPrice) * 100)}% off)
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { borderColor: colors.border }]}
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: colors.brand }]}
                                onPress={handleSaveCombo}
                            >
                                <Icon name="check" size={20} color="#FFFFFF" />
                                <Text style={styles.saveBtnText}>{editingCombo ? 'Update' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>🎁 Combo Packages</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Create and sell service combos
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.brand }]}
                    onPress={openCreateModal}
                >
                    <Icon name="plus" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.brand} />
                </View>
            ) : (
                <FlatList
                    data={combos}
                    keyExtractor={(item) => item.id}
                    renderItem={renderComboCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.brand]}
                            tintColor={colors.brand}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="package-variant" size={64} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No combos created yet
                            </Text>
                            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                                Tap + to create your first combo
                            </Text>
                        </View>
                    }
                />
            )}

            {renderCreateModal()}
            {renderServiceModal()}
            {renderSellModal()}
            {renderPaymentModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerSubtitle: { fontSize: 14, marginTop: 2 },
    addBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 120 },
    comboCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
    comboHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    comboName: { fontSize: 18, fontWeight: '700' },
    comboDescription: { fontSize: 14, marginTop: 4 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    serviceChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
    serviceChipText: { fontSize: 12, fontWeight: '600' },
    pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    originalPrice: { fontSize: 14, textDecorationLine: 'line-through' },
    comboPrice: { fontSize: 20, fontWeight: '800' },
    savingsBadge: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    savingsText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: 10 },
    sellBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
    sellBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    actionBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
    emptySubtext: { fontSize: 14, marginTop: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
    serviceModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '70%' },
    sellModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
    paymentModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, minHeight: '50%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    modalBody: { paddingHorizontal: 20, paddingVertical: 16 },
    sellModalBody: { paddingHorizontal: 20, paddingVertical: 16 },
    inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
    input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1 },
    searchInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1 },
    textArea: { height: 70, textAlignVertical: 'top' },
    searchResults: { borderRadius: 12, borderWidth: 1, marginTop: 8, maxHeight: 200 },
    searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
    customerName: { fontSize: 15, fontWeight: '600' },
    customerMobile: { fontSize: 13, marginTop: 2 },
    selectedCustomerCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, marginTop: 16 },
    selectedCustomerName: { fontSize: 16, fontWeight: '700' },
    selectedCustomerMobile: { fontSize: 13, marginTop: 2 },
    comboPriceSummary: { marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    priceLabel: { fontSize: 14 },
    priceValue: { fontSize: 16, fontWeight: '600' },
    proceedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 20, paddingVertical: 16, borderRadius: 12, gap: 8 },
    proceedBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    paymentBody: { padding: 24, alignItems: 'center' },
    paymentAmount: { fontSize: 48, fontWeight: '800' },
    paymentCustomer: { fontSize: 16, marginTop: 8 },
    paymentMethods: { flexDirection: 'row', gap: 16, marginTop: 32 },
    paymentMethodBtn: { width: 90, height: 90, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    paymentMethodText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 8 },
    qrContainer: { alignItems: 'center', marginTop: 24 },
    qrCodeWrapper: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16 },
    qrHint: { fontSize: 14, marginTop: 16 },
    confirmPaymentBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 20, gap: 8 },
    confirmPaymentText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    serviceOption: { width: (screenWidth - 60) / 3, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 2, position: 'relative' },
    serviceOptionName: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },
    serviceAdded: { fontSize: 10, fontWeight: '500', marginTop: 2 },
    removeServiceBtn: { marginTop: 4 },
    checkMark: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    pricingSection: { marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1 },
    pricingRowModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    pricingLabel: { fontSize: 14 },
    pricingValue: { fontSize: 16, fontWeight: '700' },
    priceInput: { width: 100, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, fontSize: 18, fontWeight: '700', textAlign: 'center', borderWidth: 2 },
    savingsPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
    savingsPreviewText: { fontSize: 14, fontWeight: '600', color: '#10B981' },
    modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    cancelBtnText: { fontSize: 16, fontWeight: '600' },
    saveBtn: { flex: 2, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    emptyPackages: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyPackagesText: { fontSize: 16, marginTop: 12 },
    packageItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 2 },
    packageName: { fontSize: 15, fontWeight: '600' },
    packageDesc: { fontSize: 12, marginTop: 2 },
    packagePrice: { fontSize: 16, fontWeight: '700', marginHorizontal: 12 },
    gameDetails: { flexDirection: 'row', marginTop: 4, gap: 12 },
    gameDetailBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    gameDetailText: { fontSize: 12, fontWeight: '500' },
    doneBtn: { margin: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    doneBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default ComboScreen;
