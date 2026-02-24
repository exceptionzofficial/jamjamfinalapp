import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    RefreshControl,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import QRCode from 'react-native-qrcode-svg';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import {
    getJuiceItems,
    saveJuiceOrder,
    getCustomerJuiceOrders,
    formatDateTime,
    addJuiceItem,
    updateJuiceItem,
    deleteJuiceItem,
    UPI_ID,
    getUPIString,
    getTaxByService,
    calculateTax,
} from '../utils/api';
import { SlideUp, FadeIn } from '../utils/animations';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Categories for filtering Juice Bar items
const CATEGORIES = [
    { id: 'all', name: 'All', icon: 'cup' },
    { id: 'fresh', name: 'Fresh Juices', icon: 'fruit-watermelon' },
    { id: 'smoothies', name: 'Smoothies', icon: 'blender' },
    { id: 'shakes', name: 'Milkshakes', icon: 'glass-mug-variant' },
    { id: 'mocktails', name: 'Mocktails', icon: 'glass-cocktail' },
    { id: 'healthy', name: 'Healthy Drinks', icon: 'heart' },
];

// Border colors for menu cards (like Games)
const BORDER_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
    '#06B6D4', '#EF4444', '#F97316', '#6366F1', '#DC2626',
    '#14B8A6', '#A855F7', '#22C55E', '#0EA5E9', '#E11D48',
];

// Loading animation
const JuiceLoadingAnimation = require('../assets/juice.json');

const JuiceBarScreen = ({ route, navigation }) => {
    const { colors } = useTheme();
    const customer = route.params?.customer;

    // States
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cart, setCart] = useState({});
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [showCartModal, setShowCartModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showMenuManageModal, setShowMenuManageModal] = useState(false);

    // Edit/Delete mode states (like Games)
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    // Checkout states
    const [paymentMethod, setPaymentMethod] = useState('');
    const [orderHistory, setOrderHistory] = useState([]);
    const [taxPercent, setTaxPercent] = useState(0); // Tax rate from admin settings

    // Menu management states
    const [editingItem, setEditingItem] = useState(null);
    const [menuName, setMenuName] = useState('');
    const [menuPrice, setMenuPrice] = useState('');
    const [menuCategory, setMenuCategory] = useState('veg');
    const [menuDescription, setMenuDescription] = useState('');
    const [menuQuantity, setMenuQuantity] = useState('1'); // Quantity per serving (e.g., "2" for "2 Dosa")

    // Load data with minimum 5 second loading animation
    const loadData = useCallback(async (showLoading = true) => {
        const startTime = Date.now();

        if (showLoading && menuItems.length === 0) {
            setIsLoading(true);
        }
        try {
            const [items, tax] = await Promise.all([
                getJuiceItems(),
                getTaxByService('juice'),
            ]);

            // Set tax rate
            setTaxPercent(tax || 0);

            setMenuItems(items);
        } catch (error) {
            console.error('Error loading Juice items:', error);
            if (menuItems.length === 0) {
                Alert.alert('Error', 'Could not load Juice items. Check your connection.');
            }
        } finally {
            // Ensure minimum 5 seconds loading animation
            const elapsed = Date.now() - startTime;
            const minLoadTime = showLoading && menuItems.length === 0 ? 5000 : 0;
            const remainingTime = Math.max(0, minLoadTime - elapsed);

            setTimeout(() => {
                setIsLoading(false);
                setRefreshing(false);
            }, remainingTime);
        }
    }, [menuItems.length]);

    useEffect(() => {
        loadData(true);
    }, []);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const intervalId = setInterval(() => {
            loadData(false);
        }, 5000);
        return () => clearInterval(intervalId);
    }, [loadData]);

    // Filter items by category
    const filteredItems = useMemo(() => {
        if (selectedCategory === 'all') {
            return menuItems;
        }
        return menuItems.filter(item => item.category === selectedCategory);
    }, [menuItems, selectedCategory]);

    const cartItems = useMemo(() => {
        return Object.entries(cart)
            .filter(([_, qty]) => qty > 0)
            .map(([itemId, quantity]) => {
                const item = menuItems.find(i => i.id === itemId);
                if (!item) return null;
                return {
                    ...item,
                    quantity,
                    subtotal: item.price * quantity,
                };
            })
            .filter(Boolean);
    }, [cart, menuItems]);

    const cartTotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    }, [cartItems]);

    // Calculate tax breakdown
    const taxInfo = useMemo(() => {
        return calculateTax(cartTotal, taxPercent);
    }, [cartTotal, taxPercent]);

    const cartCount = useMemo(() => {
        return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    }, [cart]);

    // Cart operations
    const addToCart = (itemId) => {
        setCart(prev => ({
            ...prev,
            [itemId]: (prev[itemId] || 0) + 1,
        }));
    };

    const removeFromCart = (itemId) => {
        setCart(prev => {
            const newQty = (prev[itemId] || 0) - 1;
            if (newQty <= 0) {
                const { [itemId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [itemId]: newQty };
        });
    };

    // Proceed to payment (skip checkout modal, go directly to payment)
    const openCheckout = () => {
        if (cartCount === 0) {
            Alert.alert('Empty Cart', 'Add items to your cart first');
            return;
        }
        setShowCartModal(false);
        setShowPaymentModal(true);
    };

    // Complete order
    const completeOrder = async () => {
        try {
            const order = {
                customerId: customer.customerId || customer.id,
                customerName: customer.name,
                customerMobile: customer.mobile,
                items: cartItems.map(item => ({
                    itemId: item.id || item.itemId,
                    name: item.name,
                    price: item.price || item.comboPrice,
                    quantity: item.quantity,
                    subtotal: item.subtotal,
                })),
                subtotal: taxInfo.subtotal,
                taxPercent: taxInfo.taxPercent,
                taxAmount: taxInfo.taxAmount,
                totalAmount: taxInfo.total,
                paymentMethod,
                service: 'Juice',
            };

            await saveJuiceOrder(order);

            Alert.alert(
                '✅ Order Confirmed',
                `Juice Bar order for ₹${taxInfo.total} has been confirmed!\nPayment: ${paymentMethod}${taxInfo.taxAmount > 0 ? `\nTax (${taxInfo.taxPercent}%): ₹${taxInfo.taxAmount}` : ''}`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setShowPaymentModal(false);
                            setCart({});
                            setPaymentMethod('');
                            navigation.goBack();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Error placing order:', error);
            Alert.alert('Error', 'Failed to place order. Please try again.');
        }
    };

    // History functions
    const openHistory = () => {
        navigation.navigate('CustomerHistory', { customer });
    };

    // Menu Management Functions
    const openAddMenu = () => {
        setEditingItem(null);
        setMenuName('');
        setMenuPrice('');
        setMenuCategory('veg');
        setMenuDescription('');
        setMenuQuantity('1');
        setShowMenuManageModal(true);
    };

    const openEditMenu = (item) => {
        setEditingItem(item);
        setMenuName(item.name);
        setMenuPrice(String(item.price));
        setMenuCategory(item.category);
        setMenuDescription(item.description || '');
        setMenuQuantity(String(item.quantity || 1));
        setShowMenuManageModal(true);
    };

    const handleSaveMenuItem = async () => {
        if (!menuName.trim()) {
            Alert.alert('Required', 'Please enter item name');
            return;
        }
        if (!menuPrice.trim() || isNaN(Number(menuPrice))) {
            Alert.alert('Required', 'Please enter valid price');
            return;
        }

        try {
            const itemData = {
                name: menuName.trim(),
                price: Number(menuPrice),
                category: menuCategory,
                description: menuDescription.trim(),
                quantity: Number(menuQuantity) || 1, // Portions per serving
                available: true,
            };

            if (editingItem) {
                await updateJuiceItem(editingItem.itemId || editingItem.id, itemData);
                Alert.alert('Success', 'Menu item updated!');
            } else {
                await addJuiceItem(itemData);
                Alert.alert('Success', 'Menu item added!');
            }

            setShowMenuManageModal(false);
            loadData(false);
        } catch (error) {
            console.error('Error saving menu item:', error);
            Alert.alert('Error', 'Failed to save menu item');
        }
    };

    const handledeleteJuiceItem = (item) => {
        Alert.alert(
            'Delete Item',
            `Are you sure you want to delete "${item.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteJuiceItem(item.itemId || item.id);
                            loadData(false);
                            Alert.alert('Deleted', 'Menu item deleted successfully');
                        } catch (error) {
                            console.error('Error deleting:', error);
                            Alert.alert('Error', 'Failed to delete menu item');
                        }
                    },
                },
            ]
        );
    };

    // Toggle edit mode (like Games)
    const toggleEditMode = useCallback(() => {
        setIsEditMode(prev => !prev);
        setIsDeleteMode(false);
    }, []);

    // Toggle delete mode (like Games)
    const toggleDeleteMode = useCallback(() => {
        setIsDeleteMode(prev => !prev);
        setIsEditMode(false);
    }, []);

    // Handle card press based on mode (like Games)
    const handleCardPress = useCallback((item) => {
        if (isEditMode) {
            openEditMenu(item);
            setIsEditMode(false);
        } else if (isDeleteMode) {
            handledeleteJuiceItem(item);
            setIsDeleteMode(false);
        } else {
            // Normal mode - add to cart
            addToCart(item.id);
        }
    }, [isEditMode, isDeleteMode, openEditMenu, handledeleteJuiceItem, addToCart]);

    // Render category tabs
    const renderCategoryTabs = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
            contentContainerStyle={styles.categoryContent}
        >
            {CATEGORIES.map(cat => (
                <TouchableOpacity
                    key={cat.id}
                    style={[
                        styles.categoryTab,
                        {
                            backgroundColor: selectedCategory === cat.id ? colors.brand : colors.surface,
                            borderColor: colors.brand,
                        }
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                >
                    <Icon
                        name={cat.icon}
                        size={18}
                        color={selectedCategory === cat.id ? '#FFFFFF' : colors.brand}
                    />
                    <Text style={[
                        styles.categoryText,
                        { color: selectedCategory === cat.id ? '#FFFFFF' : colors.brand }
                    ]}>
                        {cat.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    // Render menu item
    const renderMenuItem = ({ item, index }) => {
        const quantity = cart[item.id] || 0;
        const isCombo = !!item.comboId;
        const price = isCombo ? item.comboPrice : item.price;
        const isVeg = item.category === 'veg';
        const borderColor = BORDER_COLORS[index % BORDER_COLORS.length];
        const isInActionMode = isEditMode || isDeleteMode;

        return (
            <SlideUp delay={index * 50}>
                <TouchableOpacity
                    activeOpacity={isInActionMode ? 0.6 : 1}
                    onPress={() => isInActionMode && !isCombo ? handleCardPress(item) : null}
                >
                    <View style={[
                        styles.menuCard,
                        {
                            backgroundColor: colors.card,
                            borderColor: isInActionMode ? (isEditMode ? colors.brand : '#EF4444') : borderColor,
                            borderWidth: isInActionMode ? 2 : 2,
                        }
                    ]}>
                        {/* Mode indicator badge */}
                        {isInActionMode && !isCombo && (
                            <View style={[styles.modeIndicator, { backgroundColor: isEditMode ? colors.brand : '#EF4444' }]}>
                                <Icon name={isEditMode ? 'pencil' : 'delete'} size={14} color="#FFFFFF" />
                            </View>
                        )}

                        <View style={styles.menuCardContent}>
                            <View style={styles.menuCardLeft}>
                                <View style={styles.menuCardHeader}>
                                    {!isCombo && (
                                        <View style={[styles.vegBadge, { borderColor: isVeg ? '#22C55E' : '#EF4444' }]}>
                                            <View style={[styles.vegDot, { backgroundColor: isVeg ? '#22C55E' : '#EF4444' }]} />
                                        </View>
                                    )}
                                    {isCombo && (
                                        <View style={[styles.comboBadge, { backgroundColor: colors.accent }]}>
                                            <Icon name="package-variant" size={12} color="#FFFFFF" />
                                            <Text style={styles.comboBadgeText}>COMBO</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.menuName, { color: colors.textPrimary }]} numberOfLines={2}>
                                    {item.name}
                                </Text>
                                {item.description && (
                                    <Text style={[styles.menuDescription, { color: colors.textMuted }]} numberOfLines={2}>
                                        {item.description}
                                    </Text>
                                )}
                                <Text style={[styles.menuPrice, { color: colors.brand }]}>
                                    {item.quantity && item.quantity > 1 && (
                                        <Text style={styles.quantityBadge}>{item.quantity}× </Text>
                                    )}
                                    ₹{price}
                                    {isCombo && item.originalPrice && (
                                        <Text style={styles.originalPrice}> ₹{item.originalPrice}</Text>
                                    )}
                                </Text>

                                {/* Tap hint when in action mode */}
                                {isInActionMode && !isCombo && (
                                    <Text style={[styles.tapHint, { color: isEditMode ? colors.brand : '#EF4444' }]}>
                                        Tap to {isEditMode ? 'edit' : 'delete'}
                                    </Text>
                                )}
                            </View>

                            {/* Only show add/quantity controls when NOT in action mode */}
                            {!isInActionMode && (
                                <View style={styles.menuCardRight}>
                                    {quantity === 0 ? (
                                        <TouchableOpacity
                                            style={[styles.addButton, { backgroundColor: colors.brand }]}
                                            onPress={() => addToCart(item.id)}
                                        >
                                            <Text style={styles.addButtonText}>ADD</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={[styles.quantityControl, { backgroundColor: colors.brand }]}>
                                            <TouchableOpacity
                                                style={styles.qtyButton}
                                                onPress={() => removeFromCart(item.id)}
                                            >
                                                <Icon name="minus" size={18} color="#FFFFFF" />
                                            </TouchableOpacity>
                                            <Text style={styles.qtyText}>{quantity}</Text>
                                            <TouchableOpacity
                                                style={styles.qtyButton}
                                                onPress={() => addToCart(item.id)}
                                            >
                                                <Icon name="plus" size={18} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </SlideUp>
        );
    };

    // Render header
    const renderHeader = () => (
        <>
            {/* Customer Banner */}
            <SlideUp delay={100}>
                <View style={[styles.customerBanner, { backgroundColor: colors.card, borderColor: colors.brand }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.customerInfo}>
                        <Text style={[styles.customerName, { color: colors.textPrimary }]}>{customer?.name}</Text>
                        <Text style={[styles.customerMobile, { color: colors.textSecondary }]}>{customer?.mobile}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        {/* Edit button */}
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: isEditMode ? colors.brand : colors.surfaceLight }]}
                            onPress={toggleEditMode}
                        >
                            <Icon name="pencil" size={18} color={isEditMode ? '#FFFFFF' : colors.brand} />
                        </TouchableOpacity>
                        {/* Delete button */}
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: isDeleteMode ? '#EF4444' : colors.surfaceLight }]}
                            onPress={toggleDeleteMode}
                        >
                            <Icon name="delete" size={18} color={isDeleteMode ? '#FFFFFF' : '#EF4444'} />
                        </TouchableOpacity>
                        {/* History button */}
                        <TouchableOpacity
                            style={[styles.historyBtn, { backgroundColor: colors.accent }]}
                            onPress={openHistory}
                        >
                            <Icon name="history" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SlideUp>

            {/* Mode Banner (when in edit/delete mode) */}
            {(isEditMode || isDeleteMode) && (
                <View style={[styles.modeBanner, { backgroundColor: isEditMode ? colors.brand : '#EF4444' }]}>
                    <Icon name={isEditMode ? 'pencil' : 'delete'} size={16} color="#FFFFFF" />
                    <Text style={styles.modeBannerText}>
                        {isEditMode ? 'Tap any item to edit' : 'Tap any item to delete'}
                    </Text>
                    <TouchableOpacity onPress={() => { setIsEditMode(false); setIsDeleteMode(false); }}>
                        <Icon name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Category Tabs */}
            <FadeIn delay={200}>
                {renderCategoryTabs()}
            </FadeIn>

            {/* Section Title */}
            <SlideUp delay={300}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        {selectedCategory === 'all' ? 'All Items' :
                            selectedCategory === 'combos' ? 'Combo Offers' :
                                CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Menu'}
                    </Text>
                    <Text style={[styles.itemCount, { color: colors.textMuted }]}>
                        {filteredItems.length} items
                    </Text>
                </View>
            </SlideUp>
        </>
    );

    // Cart Modal
    const renderCartModal = () => (
        <Modal
            visible={showCartModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCartModal(false)}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Your Cart</Text>
                        <TouchableOpacity onPress={() => setShowCartModal(false)}>
                            <Icon name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {cartItems.length === 0 ? (
                        <View style={styles.emptyCart}>
                            <Icon name="cart-outline" size={64} color={colors.border} />
                            <Text style={[styles.emptyCartText, { color: colors.textMuted }]}>
                                Your cart is empty
                            </Text>
                        </View>
                    ) : (
                        <>
                            <ScrollView style={styles.cartItemsList}>
                                {cartItems.map(item => (
                                    <View key={item.id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                                        <View style={styles.cartItemLeft}>
                                            <Text style={[styles.cartItemName, { color: colors.textPrimary }]}>
                                                {item.name}
                                            </Text>
                                            <Text style={[styles.cartItemPrice, { color: colors.textMuted }]}>
                                                ₹{item.price || item.comboPrice} × {item.quantity}
                                            </Text>
                                        </View>
                                        <View style={styles.cartItemRight}>
                                            <View style={[styles.quantityControl, styles.quantityControlSmall, { backgroundColor: colors.brand }]}>
                                                <TouchableOpacity
                                                    style={styles.qtyButtonSmall}
                                                    onPress={() => removeFromCart(item.id)}
                                                >
                                                    <Icon name="minus" size={14} color="#FFFFFF" />
                                                </TouchableOpacity>
                                                <Text style={styles.qtyTextSmall}>{item.quantity}</Text>
                                                <TouchableOpacity
                                                    style={styles.qtyButtonSmall}
                                                    onPress={() => addToCart(item.id)}
                                                >
                                                    <Icon name="plus" size={14} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={[styles.cartItemSubtotal, { color: colors.brand }]}>
                                                ₹{item.subtotal}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>

                            <View style={[styles.cartFooter, { borderTopColor: colors.border }]}>
                                <View style={styles.cartTotal}>
                                    <Text style={[styles.cartTotalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                                    <Text style={[styles.cartTotalValue, { color: colors.textPrimary }]}>
                                        ₹{taxInfo.subtotal}
                                    </Text>
                                </View>
                                {taxInfo.taxPercent > 0 && (
                                    <View style={styles.cartTotal}>
                                        <Text style={[styles.cartTotalLabel, { color: colors.textSecondary }]}>Tax ({taxInfo.taxPercent}%)</Text>
                                        <Text style={[styles.cartTotalValue, { color: colors.textSecondary }]}>₹{taxInfo.taxAmount}</Text>
                                    </View>
                                )}
                                <View style={[styles.cartTotal, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }]}>
                                    <Text style={[styles.cartTotalLabel, { color: colors.textPrimary, fontWeight: '700' }]}>Total</Text>
                                    <Text style={[styles.cartTotalValue, { color: colors.brand }]}>
                                        ₹{taxInfo.total}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.checkoutButton, { backgroundColor: colors.brand }]}
                                    onPress={openCheckout}
                                >
                                    <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                                    <Icon name="arrow-right" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );

    // Checkout Modal - No longer needed, skipping directly to payment
    const renderCheckoutModal = () => null;

    // Payment Modal
    const renderPaymentModal = () => (
        <Modal
            visible={showPaymentModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowPaymentModal(false)}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Payment</Text>
                        <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                            <Icon name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.paymentScrollView}
                        contentContainerStyle={styles.paymentContent}
                    >
                        <View style={styles.paymentAmountSection}>
                            <Text style={[styles.paymentTotal, { color: colors.textPrimary }]}>
                                Total Amount
                            </Text>
                            <Text style={[styles.paymentAmount, { color: colors.brand }]}>
                                ₹{taxInfo.total}
                            </Text>
                        </View>

                        <Text style={[styles.checkoutLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                            Select Payment Method
                        </Text>
                        <View style={styles.paymentOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.paymentOption,
                                    {
                                        backgroundColor: paymentMethod === 'QR' ? '#8B5CF6' : colors.surface,
                                        borderColor: '#8B5CF6',
                                    }
                                ]}
                                onPress={() => setPaymentMethod('QR')}
                            >
                                <Icon
                                    name="qrcode-scan"
                                    size={32}
                                    color={paymentMethod === 'QR' ? '#FFFFFF' : '#8B5CF6'}
                                />
                                <Text style={[
                                    styles.paymentOptionText,
                                    { color: paymentMethod === 'QR' ? '#FFFFFF' : '#8B5CF6' }
                                ]}>
                                    QR Payment
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.paymentOption,
                                    {
                                        backgroundColor: paymentMethod === 'Cash' ? '#10B981' : colors.surface,
                                        borderColor: '#10B981',
                                    }
                                ]}
                                onPress={() => setPaymentMethod('Cash')}
                            >
                                <Icon
                                    name="cash"
                                    size={32}
                                    color={paymentMethod === 'Cash' ? '#FFFFFF' : '#10B981'}
                                />
                                <Text style={[
                                    styles.paymentOptionText,
                                    { color: paymentMethod === 'Cash' ? '#FFFFFF' : '#10B981' }
                                ]}>
                                    Cash
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* QR Code Display */}
                        {paymentMethod === 'QR' && (
                            <View style={styles.qrCodeSection}>
                                <View style={[styles.qrCodeContainer, { backgroundColor: '#FFFFFF' }]}>
                                    <QRCode
                                        value={getUPIString()}
                                        size={200}
                                        backgroundColor="#FFFFFF"
                                        color="#000000"
                                    />
                                </View>
                                <Text style={[styles.qrScanText, { color: colors.textPrimary }]}>
                                    Scan to Pay ₹{taxInfo.total}
                                </Text>
                                <Text style={[styles.qrUpiText, { color: colors.textMuted }]}>
                                    UPI: {UPI_ID}
                                </Text>
                            </View>
                        )}

                        {/* Cash Payment Info */}
                        {paymentMethod === 'Cash' && (
                            <View style={styles.cashSection}>
                                <Icon name="cash-multiple" size={64} color="#10B981" />
                                <Text style={[styles.cashText, { color: colors.textPrimary }]}>
                                    Collect ₹{taxInfo.total} from customer
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <TouchableOpacity
                        style={[
                            styles.proceedButton,
                            { backgroundColor: paymentMethod ? colors.brand : colors.surfaceLight }
                        ]}
                        onPress={completeOrder}
                        disabled={!paymentMethod}
                    >
                        <Icon name="check-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.proceedButtonText}>Confirm Order</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // History Modal
    const renderHistoryModal = () => (
        <Modal
            visible={showHistoryModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowHistoryModal(false)}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Order History</Text>
                        <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                            <Icon name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {orderHistory.length === 0 ? (
                        <View style={styles.emptyCart}>
                            <Icon name="history" size={64} color={colors.border} />
                            <Text style={[styles.emptyCartText, { color: colors.textMuted }]}>
                                No order history yet
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={orderHistory}
                            keyExtractor={(item, index) => item.orderId || `order-${index}`}
                            renderItem={({ item }) => (
                                <View style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={styles.historyCardHeader}>
                                        <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                                            {formatDateTime(item.timestamp)}
                                        </Text>
                                        <View style={[
                                            styles.historyTypeBadge,
                                            { backgroundColor: item.orderType === 'room' ? '#8B5CF6' : colors.brand }
                                        ]}>
                                            <Icon
                                                name={item.orderType === 'room' ? 'bed' : 'table-furniture'}
                                                size={12}
                                                color="#FFFFFF"
                                            />
                                            <Text style={styles.historyTypeText}>
                                                {item.orderType === 'room' ? `Room ${item.roomNo}` : `Table ${item.tableNo}`}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.historyItems}>
                                        {item.items?.slice(0, 3).map((orderItem, idx) => (
                                            <Text key={idx} style={[styles.historyItemText, { color: colors.textPrimary }]}>
                                                • {orderItem.name} × {orderItem.quantity}
                                            </Text>
                                        ))}
                                        {item.items?.length > 3 && (
                                            <Text style={[styles.historyItemMore, { color: colors.textMuted }]}>
                                                +{item.items.length - 3} more items
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.historyCardFooter}>
                                        <View style={[
                                            styles.paymentBadge,
                                            { backgroundColor: item.paymentMethod === 'Cash' ? '#10B981' : '#8B5CF6' }
                                        ]}>
                                            <Icon
                                                name={item.paymentMethod === 'Cash' ? 'cash' : 'qrcode-scan'}
                                                size={12}
                                                color="#FFFFFF"
                                            />
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

    // Menu Management Modal
    const renderMenuManageModal = () => (
        <Modal
            visible={showMenuManageModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowMenuManageModal(false)}
        >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            {editingItem ? 'Edit Menu Item' : 'Add New Item'}
                        </Text>
                        <TouchableOpacity onPress={() => setShowMenuManageModal(false)}>
                            <Icon name="close" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.menuFormContent}>
                        {/* Item Name */}
                        <Text style={[styles.checkoutLabel, { color: colors.textPrimary }]}>
                            Item Name *
                        </Text>
                        <TextInput
                            style={[styles.checkoutInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="Enter item name"
                            placeholderTextColor={colors.textMuted}
                            value={menuName}
                            onChangeText={setMenuName}
                        />

                        {/* Price */}
                        <Text style={[styles.checkoutLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                            Price (₹) *
                        </Text>
                        <TextInput
                            style={[styles.checkoutInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="Enter price"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            value={menuPrice}
                            onChangeText={setMenuPrice}
                        />

                        {/* Category */}
                        <Text style={[styles.checkoutLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                            Category *
                        </Text>
                        <View style={styles.categorySelectRow}>
                            {[
                                { id: 'veg', name: 'Veg', icon: 'leaf', color: '#22C55E' },
                                { id: 'non-veg', name: 'Non-Veg', icon: 'food-drumstick', color: '#EF4444' },
                                { id: 'drinks', name: 'Drinks', icon: 'cup', color: '#3B82F6' },
                                { id: 'desserts', name: 'Desserts', icon: 'ice-cream', color: '#EC4899' },
                            ].map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categorySelectBtn,
                                        {
                                            backgroundColor: menuCategory === cat.id ? cat.color : colors.surface,
                                            borderColor: cat.color,
                                        }
                                    ]}
                                    onPress={() => setMenuCategory(cat.id)}
                                >
                                    <Icon
                                        name={cat.icon}
                                        size={16}
                                        color={menuCategory === cat.id ? '#FFFFFF' : cat.color}
                                    />
                                    <Text style={[
                                        styles.categorySelectText,
                                        { color: menuCategory === cat.id ? '#FFFFFF' : cat.color }
                                    ]}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Quantity per serving */}
                        <Text style={[styles.checkoutLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                            Quantity per Serving
                        </Text>
                        <Text style={[styles.helperText, { color: colors.textMuted }]}>
                            e.g., "2" for 2 Dosa at this price
                        </Text>
                        <TextInput
                            style={[styles.checkoutInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="Enter quantity (default: 1)"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            value={menuQuantity}
                            onChangeText={setMenuQuantity}
                        />

                        {/* Description */}
                        <Text style={[styles.checkoutLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                            Description (Optional)
                        </Text>
                        <TextInput
                            style={[styles.checkoutInput, styles.textArea, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="Enter description"
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={3}
                            value={menuDescription}
                            onChangeText={setMenuDescription}
                        />
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.proceedButton, { backgroundColor: colors.brand }]}
                        onPress={handleSaveMenuItem}
                    >
                        <Icon name={editingItem ? 'content-save' : 'plus-circle'} size={20} color="#FFFFFF" />
                        <Text style={styles.proceedButtonText}>
                            {editingItem ? 'Save Changes' : 'Add Item'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
                <LottieView
                    source={JuiceLoadingAnimation}
                    autoPlay
                    loop
                    style={styles.lottieAnimation}
                />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Loading Menu...
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header subtitle="Juice" showTypewriter={false} />

            <FlatList
                data={filteredItems}
                keyExtractor={(item, index) => item.id || item.itemId || `item-${index}`}
                renderItem={renderMenuItem}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadData(false);
                        }}
                        colors={[colors.brand]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="food-off" size={64} color={colors.border} />
                        <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                            No items in this category
                        </Text>
                    </View>
                }
            />

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <TouchableOpacity
                    style={[styles.floatingCart, { backgroundColor: colors.brand }]}
                    onPress={() => setShowCartModal(true)}
                >
                    <View style={styles.floatingCartContent}>
                        <View style={styles.floatingCartLeft}>
                            <Icon name="cart" size={24} color="#FFFFFF" />
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{cartCount}</Text>
                            </View>
                        </View>
                        <Text style={styles.floatingCartText}>View Cart ₹{taxInfo.total}</Text>
                        <Icon name="chevron-right" size={24} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>
            )}

            {/* Floating Add Menu Button */}
            <TouchableOpacity
                style={[styles.floatingAddBtn, { backgroundColor: colors.accent }]}
                onPress={openAddMenu}
            >
                <Icon name="plus" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Modals */}
            {renderCartModal()}
            {renderCheckoutModal()}
            {renderPaymentModal()}
            {renderHistoryModal()}
            {renderMenuManageModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottieAnimation: {
        width: 200,
        height: 200,
    },
    loadingText: {
        fontSize: 16,
        marginTop: 16,
    },
    listContent: {
        paddingBottom: 100,
    },
    customerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    backButton: {
        padding: 8,
    },
    customerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    customerName: {
        fontSize: 18,
        fontWeight: '700',
    },
    customerMobile: {
        fontSize: 14,
        marginTop: 2,
    },
    historyBtn: {
        padding: 10,
        borderRadius: 8,
    },
    categoryContainer: {
        marginTop: 16,
    },
    categoryContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        gap: 6,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    itemCount: {
        fontSize: 14,
    },
    menuCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    menuCardContent: {
        flexDirection: 'row',
        padding: 16,
    },
    menuCardLeft: {
        flex: 1,
    },
    menuCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    vegBadge: {
        width: 16,
        height: 16,
        borderWidth: 2,
        borderRadius: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vegDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    comboBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 4,
        gap: 4,
    },
    comboBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    menuName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    menuDescription: {
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
    },
    menuPrice: {
        fontSize: 16,
        fontWeight: '700',
    },
    originalPrice: {
        fontSize: 13,
        textDecorationLine: 'line-through',
        color: '#9CA3AF',
    },
    menuCardRight: {
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    addButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
    },
    qtyButton: {
        padding: 8,
    },
    qtyText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        minWidth: 24,
        textAlign: 'center',
    },
    quantityControlSmall: {
        borderRadius: 6,
    },
    qtyButtonSmall: {
        padding: 6,
    },
    qtyTextSmall: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        minWidth: 20,
        textAlign: 'center',
    },
    floatingCart: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        borderRadius: 12,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    floatingCartContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    floatingCartLeft: {
        position: 'relative',
    },
    cartBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    floatingCartText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContainer: {
        maxHeight: '85%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    emptyCart: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyCartText: {
        fontSize: 16,
        marginTop: 16,
    },
    cartItemsList: {
        maxHeight: 300,
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    cartItemLeft: {
        flex: 1,
    },
    cartItemName: {
        fontSize: 15,
        fontWeight: '600',
    },
    cartItemPrice: {
        fontSize: 13,
        marginTop: 2,
    },
    cartItemRight: {
        alignItems: 'flex-end',
        gap: 8,
    },
    cartItemSubtotal: {
        fontSize: 15,
        fontWeight: '700',
    },
    cartFooter: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
    },
    cartTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cartTotalLabel: {
        fontSize: 18,
        fontWeight: '600',
    },
    cartTotalValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    checkoutButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    checkoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    checkoutContent: {
        paddingHorizontal: 16,
    },
    checkoutLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    orderTypeOptions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    orderTypeOption: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        gap: 8,
    },
    orderTypeText: {
        fontSize: 16,
        fontWeight: '600',
    },
    checkoutInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    orderSummary: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryItemName: {
        fontSize: 14,
        flex: 1,
    },
    summaryItemPrice: {
        fontSize: 14,
    },
    summaryTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        marginTop: 12,
        borderTopWidth: 1,
    },
    summaryTotalLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    summaryTotalValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    proceedButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    proceedButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    paymentContent: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    paymentTotal: {
        fontSize: 16,
    },
    paymentAmount: {
        fontSize: 36,
        fontWeight: '700',
    },
    paymentOptions: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
    },
    paymentOption: {
        flex: 1,
        alignItems: 'center',
        padding: 24,
        borderRadius: 12,
        borderWidth: 2,
        gap: 12,
    },
    paymentOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    historyCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    historyDate: {
        fontSize: 12,
    },
    historyTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        gap: 4,
    },
    historyTypeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    historyItems: {
        marginBottom: 12,
    },
    historyItemText: {
        fontSize: 13,
        marginBottom: 2,
    },
    historyItemMore: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    historyCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        gap: 4,
    },
    paymentBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    historyTotal: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyStateText: {
        fontSize: 16,
        marginTop: 16,
    },
    // QR Code Styles
    paymentScrollView: {
        maxHeight: 400,
    },
    paymentContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    paymentAmountSection: {
        alignItems: 'center',
        marginBottom: 8,
    },
    qrCodeSection: {
        alignItems: 'center',
        marginTop: 24,
        paddingVertical: 20,
    },
    qrCodeContainer: {
        padding: 20,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    qrScanText: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 16,
    },
    qrUpiText: {
        fontSize: 14,
        marginTop: 4,
    },
    cashSection: {
        alignItems: 'center',
        marginTop: 24,
        paddingVertical: 20,
    },
    cashText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 12,
    },
    // Menu Management Styles
    menuFormContent: {
        paddingHorizontal: 16,
        maxHeight: 400,
    },
    categorySelectRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categorySelectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6,
    },
    categorySelectText: {
        fontSize: 13,
        fontWeight: '600',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    floatingAddBtn: {
        position: 'absolute',
        bottom: 100,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    menuCardActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        justifyContent: 'flex-end',
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    helperText: {
        fontSize: 12,
        marginBottom: 6,
        marginTop: 2,
    },
    quantityBadge: {
        fontWeight: '700',
        fontSize: 15,
    },
    // Mode styles (like Games)
    modeIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    tapHint: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 6,
    },
    modeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 10,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
    },
    modeBannerText: {
        flex: 1,
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
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
});

export default JuiceBarScreen;
