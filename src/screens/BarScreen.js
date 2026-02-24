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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import QRCode from 'react-native-qrcode-svg';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import {
    getMenuItems,
    saveBarOrder,
    getCustomerBarOrders,
    getTaxByService,
    calculateTax,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    UPI_ID,
    getUPIString,
} from '../utils/api';
import { SlideUp, FadeIn } from '../utils/animations';
import { printKOT } from '../utils/PrinterService';

// Safe Dimensions access with fallback
let isTablet = false;
try {
    isTablet = Dimensions.get('window').width >= 768;
} catch (error) {
    console.warn('Dimensions not available during BarScreen initialization');
}

// Categories for Bar
const CATEGORIES = [
    { id: 'all', name: 'All', icon: 'glass-cocktail' },
    { id: 'whiskey', name: 'Whiskey', icon: 'glass-wine' },
    { id: 'brandy', name: 'Brandy', icon: 'glass-wine' },
    { id: 'beer', name: 'Beer', icon: 'glass-mug' },
    { id: 'wine', name: 'Wine', icon: 'glass-wine' },
    { id: 'cocktails', name: 'Cocktails', icon: 'glass-cocktail' },
    { id: 'vodka', name: 'Vodka', icon: 'bottle-wine' },
    { id: 'gin', name: 'Gin', icon: 'bottle-wine' },
    { id: 'rum', name: 'Rum', icon: 'bottle-wine' },
    { id: 'snacks', name: 'Snacks', icon: 'food-variant' },
    { id: 'kitchen', name: 'Kitchen', icon: 'silverware-fork-knife' },
];

const BORDER_COLORS = [
    '#DC2626', '#3B82F6', '#10B981', '#F59E0B', '#EC4899',
    '#8B5CF6', '#06B6D4', '#EF4444', '#F97316', '#6366F1',
];

const BAR_CATEGORY_IDS = CATEGORIES.map(c => c.id).filter(id => id !== 'all');

const BarLoadingAnimation = require('../assets/room.json');

const BarScreen = ({ route, navigation }) => {
    const { colors } = useTheme();
    const customer = route.params?.customer;

    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cart, setCart] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [taxPercent, setTaxPercent] = useState(18); // Default 18% for bar

    // Modal states
    const [showCartModal, setShowCartModal] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showMenuManageModal, setShowMenuManageModal] = useState(false);

    // Edit/Delete mode states
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    // Checkout states
    const [paymentMethod, setPaymentMethod] = useState('');
    const [tableNo, setTableNo] = useState('');

    // Menu management states
    const [editingItem, setEditingItem] = useState(null);
    const [menuName, setMenuName] = useState('');
    const [menuPrice, setMenuPrice] = useState('');
    const [menuCategory, setMenuCategory] = useState('whiskey');
    const [menuDescription, setMenuDescription] = useState('');
    const [menuStock, setMenuStock] = useState('');
    const [menuShotPrice, setMenuShotPrice] = useState('');
    const [menuVolume, setMenuVolume] = useState('');

    const loadData = useCallback(async (showLoading = true) => {
        const startTime = Date.now();
        if (showLoading && menuItems.length === 0) setIsLoading(true);

        try {
            const [items, tax] = await Promise.all([
                getMenuItems(),
                getTaxByService('bar'),
            ]);

            setTaxPercent(tax || 18);

            // Filter only items that belong to Bar categories
            const barOnlyItems = items.filter(item =>
                BAR_CATEGORY_IDS.includes(item.category?.toLowerCase())
            );

            setMenuItems(barOnlyItems);
        } catch (error) {
            console.error('Error loading bar menu:', error);
        } finally {
            const elapsed = Date.now() - startTime;
            const minLoadTime = showLoading && menuItems.length === 0 ? 3000 : 0;
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

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [menuItems, selectedCategory, searchQuery]);

    const cartItems = useMemo(() => {
        return Object.entries(cart)
            .filter(([_, qty]) => qty > 0)
            .map(([compositeId, quantity]) => {
                const [itemId, servingType] = compositeId.split(':');
                const item = menuItems.find(i => i.id === itemId);
                if (!item) return null;

                const name = servingType ? `${item.name} (${servingType})` : item.name;
                const price = servingType === 'Shot' ? (item.shotPrice || item.price / 12) : item.price;

                return {
                    ...item,
                    compositeId,
                    itemId,
                    servingType,
                    displayName: name,
                    displayPrice: Math.round(price),
                    quantity,
                    subtotal: Math.round(price) * quantity,
                };
            })
            .filter(Boolean);
    }, [cart, menuItems]);

    const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.subtotal, 0), [cartItems]);
    const taxInfo = useMemo(() => calculateTax(cartTotal, taxPercent), [cartTotal, taxPercent]);
    const cartCount = useMemo(() => Object.values(cart).reduce((sum, qty) => sum + qty, 0), [cart]);

    const addToCart = (itemId, servingType = null) => {
        const compositeId = servingType ? `${itemId}:${servingType}` : itemId;
        setCart(prev => ({ ...prev, [compositeId]: (prev[compositeId] || 0) + 1 }));
    };

    const removeFromCart = (compositeId) => {
        setCart(prev => {
            const newQty = (prev[compositeId] || 0) - 1;
            if (newQty <= 0) {
                const { [compositeId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [compositeId]: newQty };
        });
    };

    const handleSaveOrder = async () => {
        if (!paymentMethod) {
            Alert.alert('Required', 'Please select payment method');
            return;
        }

        try {
            const order = {
                customerId: customer.customerId || customer.id,
                customerName: customer.name,
                customerMobile: customer.mobile,
                items: cartItems.map(item => ({
                    itemId: item.itemId,
                    name: item.displayName,
                    category: item.category || '',
                    price: item.displayPrice,
                    quantity: item.quantity,
                    subtotal: item.subtotal,
                    servingType: item.servingType,
                })),
                subtotal: taxInfo.subtotal,
                taxPercent: taxInfo.taxPercent,
                taxAmount: taxInfo.taxAmount,
                totalAmount: taxInfo.total,
                paymentMethod,
                tableNo,
                service: 'Bar',
                timestamp: new Date().toISOString(),
            };

            await saveBarOrder(order);

            // Generate KOT for kitchen items
            const kitchenItems = cartItems.filter(ci => {
                const cat = (ci.category || '').toLowerCase();
                return cat === 'kitchen';
            });
            if (kitchenItems.length > 0) {
                const kotOrder = {
                    tableNo: tableNo || 'Bar',
                    orderType: 'dining',
                    items: kitchenItems.map(ci => ({
                        name: ci.displayName,
                        quantity: ci.quantity,
                    })),
                    timestamp: new Date().toISOString(),
                };
                await printKOT(kotOrder);
            }

            Alert.alert('Success', 'Order placed successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to place order');
        }
    };

    const handleSaveMenuItem = async () => {
        if (!menuName.trim() || !menuPrice) {
            Alert.alert('Error', 'Name and Price are required');
            return;
        }
        try {
            const itemData = {
                name: menuName,
                price: Number(menuPrice),
                category: menuCategory,
                description: menuDescription,
                stock: parseFloat(menuStock) || 0,
                shotPrice: parseFloat(menuShotPrice) || undefined,
                volumePerUnit: parseFloat(menuVolume) || undefined,
                available: true,
            };
            if (editingItem) {
                await updateMenuItem(editingItem.id, itemData);
            } else {
                await addMenuItem(itemData);
            }
            setShowMenuManageModal(false);
            loadData(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to save item');
        }
    };

    const handleItemPress = (item) => {
        if (isEditMode) {
            setEditingItem(item);
            setMenuName(item.name);
            setMenuPrice(String(item.price));
            setMenuCategory(item.category);
            setMenuDescription(item.description || '');
            setMenuStock(String(item.stock || 0));
            setMenuShotPrice(String(item.shotPrice || ''));
            setMenuVolume(String(item.volumePerUnit || ''));
            setShowMenuManageModal(true);
            setIsEditMode(false);
        } else if (isDeleteMode) {
            Alert.alert('Delete', `Delete ${item.name}?`, [
                { text: 'Cancel' },
                {
                    text: 'Delete', onPress: async () => {
                        await deleteMenuItem(item.id);
                        loadData(false);
                    }
                }
            ]);
            setIsDeleteMode(false);
        } else {
            addToCart(item.id);
        }
    };

    const renderMenuItem = ({ item, index }) => {
        const category = item.category ? item.category.toLowerCase().trim() : '';
        const isSpirit = ['whiskey', 'rum', 'vodka', 'gin', 'brandy', 'beer', 'wine'].includes(category) ||
            (!!item.shotPrice && !['kitchen', 'snacks', 'cocktails'].includes(category));

        const shotId = `${item.id}:Shot`;
        const bottleId = `${item.id}:Bottle`;

        const qty = cart[item.id] || 0;
        const shotQty = cart[shotId] || 0;
        const bottleQty = cart[bottleId] || 0;
        const color = BORDER_COLORS[index % BORDER_COLORS.length];
        const isEditing = isEditMode || isDeleteMode;

        return (
            <SlideUp delay={index * 30}>
                <TouchableOpacity
                    onPress={() => (isEditing || !isSpirit) && handleItemPress(item)}
                    activeOpacity={isEditing ? 0.7 : (isSpirit ? 1 : 0.7)}
                >
                    <View style={[styles.card, { borderColor: color, backgroundColor: colors.card, paddingVertical: 8 }]}>
                        <View style={styles.cardContent}>
                            <View style={styles.cardLeft}>
                                <Text style={[styles.itemName, { color: colors.textPrimary, fontSize: 18, marginBottom: 4 }]}>{item.name}</Text>

                                <Text style={[styles.itemPrice, { color: colors.brand, fontSize: 16, fontWeight: '800', marginBottom: 6 }]}>₹{item.price}</Text>

                                {item.stock !== undefined && (
                                    <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 6 }}>
                                        <Text style={[
                                            styles.stockText,
                                            { color: item.stock <= (item.lowStockThreshold || 5) ? '#EF4444' : '#10B981', fontSize: 13, fontWeight: '700' }
                                        ]}>
                                            {(() => {
                                                if (category === 'kitchen' || category === 'snacks' || category === 'cocktails') {
                                                    return `Stock: ${item.stock}`;
                                                }
                                                const vol = item.volumePerUnit || 750;
                                                const totalMl = Math.max(0, item.stock || 0);
                                                const bottles = Math.floor(totalMl / vol);
                                                const ml = Math.round(totalMl % vol);
                                                if (bottles === 0 && ml === 0) return 'Stock: 0';
                                                if (bottles === 0) return `Stock: ${ml}ml`;
                                                return `Stock: ${bottles} Btl${ml > 0 ? ` ${ml}ml` : ''}`;
                                            })()}
                                        </Text>
                                    </View>
                                )}

                                {item.description && (
                                    <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                                )}
                            </View>
                            {!isEditing && (
                                <View style={styles.cardRight}>
                                    {isSpirit ? (
                                        <View style={{ gap: 10 }}>
                                            {/* Shot Button */}
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>Shot (30ml)</Text>
                                                {shotQty === 0 ? (
                                                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.brand, minWidth: 80 }]} onPress={() => addToCart(item.id, 'Shot')}>
                                                        <Text style={styles.addBtnText}>ADD SHOT</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={[styles.qtyControl, { backgroundColor: colors.brand, minWidth: 80 }]}>
                                                        <TouchableOpacity onPress={() => removeFromCart(shotId)} style={styles.qtyBtn}>
                                                            <Icon name="minus" size={16} color="#FFF" />
                                                        </TouchableOpacity>
                                                        <Text style={styles.qtyText}>{shotQty}</Text>
                                                        <TouchableOpacity onPress={() => addToCart(item.id, 'Shot')} style={styles.qtyBtn}>
                                                            <Icon name="plus" size={16} color="#FFF" />
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Bottle Button */}
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>Full Bottle</Text>
                                                {bottleQty === 0 ? (
                                                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.brand, minWidth: 80 }]} onPress={() => addToCart(item.id, 'Bottle')}>
                                                        <Text style={styles.addBtnText}>ADD BTL</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={[styles.qtyControl, { backgroundColor: colors.brand, minWidth: 80 }]}>
                                                        <TouchableOpacity onPress={() => removeFromCart(bottleId)} style={styles.qtyBtn}>
                                                            <Icon name="minus" size={16} color="#FFF" />
                                                        </TouchableOpacity>
                                                        <Text style={styles.qtyText}>{bottleQty}</Text>
                                                        <TouchableOpacity onPress={() => addToCart(item.id, 'Bottle')} style={styles.qtyBtn}>
                                                            <Icon name="plus" size={16} color="#FFF" />
                                                        </TouchableOpacity>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    ) : (
                                        qty === 0 ? (
                                            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.brand }]} onPress={() => handleItemPress(item)}>
                                                <Text style={styles.addBtnText}>ADD</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={[styles.qtyControl, { backgroundColor: colors.brand }]}>
                                                <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.qtyBtn}>
                                                    <Icon name="minus" size={18} color="#FFF" />
                                                </TouchableOpacity>
                                                <Text style={styles.qtyText}>{qty}</Text>
                                                <TouchableOpacity onPress={() => addToCart(item.id)} style={styles.qtyBtn}>
                                                    <Icon name="plus" size={18} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
            </SlideUp >
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: '#1F2937' }]}>
                <LottieView source={BarLoadingAnimation} autoPlay loop style={{ width: 200, height: 200 }} />
                <Text style={{ color: '#FFF', marginTop: 20 }}>Setting up the bar...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Bar Service" subtitle={customer?.name} />

            <View style={styles.header}>
                <View style={styles.topRow}>
                    <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Icon name="magnify" size={20} color={colors.textSecondary} />
                        <TextInput
                            placeholder="Search bar..."
                            placeholderTextColor={colors.textMuted}
                            style={[styles.searchInput, { color: colors.textPrimary }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery !== '' && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Icon name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.adminBtns}>
                        <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)} style={[styles.adminBtn, { backgroundColor: isEditMode ? colors.brand : colors.card }]}>
                            <Icon name="pencil" size={20} color={isEditMode ? '#FFF' : colors.brand} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsDeleteMode(!isDeleteMode)} style={[styles.adminBtn, { backgroundColor: isDeleteMode ? '#EF4444' : colors.card }]}>
                            <Icon name="delete" size={20} color={isDeleteMode ? '#FFF' : '#EF4444'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setEditingItem(null); setShowMenuManageModal(true); }} style={[styles.adminBtn, { backgroundColor: colors.brand }]}>
                            <Icon name="plus" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.catBtn, { backgroundColor: selectedCategory === cat.id ? colors.brand : colors.card }]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Icon name={cat.icon} size={18} color={selectedCategory === cat.id ? '#FFF' : colors.brand} />
                            <Text style={[styles.catText, { color: selectedCategory === cat.id ? '#FFF' : colors.textPrimary }]}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={filteredItems}
                renderItem={renderMenuItem}
                keyExtractor={item => item.id || item.itemId}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false)} />}
                ListEmptyComponent={<Text style={[styles.empty, { color: colors.textSecondary }]}>No items found in this category.</Text>}
            />

            {cartCount > 0 && (
                <TouchableOpacity style={[styles.cartBar, { backgroundColor: colors.brand }]} onPress={() => setShowCartModal(true)}>
                    <View style={styles.cartInfo}>
                        <Text style={styles.cartCount}>{cartCount} Items</Text>
                        <Text style={styles.cartTotal}>₹{taxInfo.total}</Text>
                    </View>
                    <Text style={styles.viewCart}>View Cart →</Text>
                </TouchableOpacity>
            )}

            <Modal visible={showCartModal} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Your Order</Text>
                            <TouchableOpacity onPress={() => setShowCartModal(false)}>
                                <Icon name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {cartItems.map(item => (
                                <View key={item.compositeId} style={styles.cartItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{item.displayName}</Text>
                                        <Text style={{ color: colors.textSecondary }}>₹{item.displayPrice} × {item.quantity}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: colors.brand, fontWeight: '700' }}>₹{item.subtotal}</Text>
                                        <TouchableOpacity onPress={() => removeFromCart(item.compositeId)} style={{ marginTop: 5 }}>
                                            <Icon name="trash-can-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        <View style={styles.summary}>
                            <View style={styles.row}><Text style={{ color: colors.textSecondary }}>Subtotal</Text><Text style={{ color: colors.textPrimary }}>₹{taxInfo.subtotal}</Text></View>
                            <View style={styles.row}><Text style={{ color: colors.textSecondary }}>Tax ({taxPercent}%)</Text><Text style={{ color: colors.textPrimary }}>₹{taxInfo.taxAmount}</Text></View>
                            <View style={[styles.row, { borderTopWidth: 1, paddingTop: 10, marginTop: 10 }]}><Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Total</Text><Text style={{ fontSize: 18, fontWeight: '700', color: colors.brand }}>₹{taxInfo.total}</Text></View>
                        </View>
                        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.brand }]} onPress={() => { setShowCartModal(false); setShowCheckoutModal(true); }}>
                            <Text style={styles.primaryBtnText}>Checkout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showCheckoutModal} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 20 }]}>Order Details</Text>
                        <TextInput
                            placeholder="Table Number (Optional)"
                            placeholderTextColor={colors.textMuted}
                            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                            value={tableNo}
                            onChangeText={setTableNo}
                        />
                        <Text style={{ color: colors.textSecondary, marginBottom: 10, marginTop: 10 }}>Payment Method</Text>
                        <View style={styles.paymentGrid}>
                            {['Cash', 'UPI', 'Pay Later'].map(method => (
                                <TouchableOpacity
                                    key={method}
                                    style={[styles.payBtn, { borderColor: paymentMethod === method ? colors.brand : colors.border }]}
                                    onPress={() => setPaymentMethod(method)}
                                >
                                    <Text style={{ color: paymentMethod === method ? colors.brand : colors.textPrimary }}>{method}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* UPI Details Display */}
                        {paymentMethod === 'UPI' && (
                            <View style={styles.qrSection}>
                                <View style={styles.qrContainer}>
                                    <QRCode
                                        value={getUPIString(taxInfo.total)}
                                        size={isTablet ? 180 : 150}
                                        backgroundColor="#FFF"
                                        color="#000"
                                    />
                                </View>
                                <Text style={[styles.qrText, { color: colors.textPrimary }]}>Scan to Pay ₹{taxInfo.total}</Text>
                                <Text style={[styles.upiIdText, { color: colors.brand }]}>UPI ID: {UPI_ID}</Text>
                            </View>
                        )}

                        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.brand, marginTop: 20 }]} onPress={handleSaveOrder}>
                            <Text style={styles.primaryBtnText}>Confirm Order</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ marginTop: 15, alignItems: 'center' }} onPress={() => setShowCheckoutModal(false)}>
                            <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showMenuManageModal} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary, marginBottom: 20 }]}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
                        <TextInput placeholder="Item Name" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} value={menuName} onChangeText={setMenuName} />
                        <TextInput placeholder="Price" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, marginTop: 10 }]} value={menuPrice} onChangeText={setMenuPrice} keyboardType="numeric" />
                        <TextInput placeholder="Description" placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, marginTop: 10 }]} value={menuDescription} onChangeText={setMenuDescription} />
                        <TextInput placeholder={menuCategory === 'kitchen' || menuCategory === 'snacks' ? 'Stock (quantity)' : 'Stock (in ml)'} placeholderTextColor={colors.textMuted} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, marginTop: 10 }]} value={menuStock} onChangeText={setMenuStock} keyboardType="numeric" />
                        {['whiskey', 'rum', 'vodka', 'gin', 'brandy', 'beer', 'wine'].includes(menuCategory?.toLowerCase()) && (
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                <TextInput placeholder="Shot Price" placeholderTextColor={colors.textMuted} style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border }]} value={menuShotPrice} onChangeText={setMenuShotPrice} keyboardType="numeric" />
                                <TextInput placeholder="Btl Volume (ml)" placeholderTextColor={colors.textMuted} style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border }]} value={menuVolume} onChangeText={setMenuVolume} keyboardType="numeric" />
                            </View>
                        )}
                        <ScrollView horizontal style={{ marginTop: 15, maxHeight: 40 }} showsHorizontalScrollIndicator={false}>
                            {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                <TouchableOpacity key={cat.id} style={[styles.catTiny, { backgroundColor: menuCategory === cat.id ? colors.brand : colors.surface }]} onPress={() => setMenuCategory(cat.id)}>
                                    <Text style={{ color: menuCategory === cat.id ? '#FFF' : colors.textPrimary, fontSize: 12 }}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.brand, marginTop: 20 }]} onPress={handleSaveMenuItem}>
                            <Text style={styles.primaryBtnText}>Save Item</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ marginTop: 15, alignItems: 'center' }} onPress={() => setShowMenuManageModal(false)}>
                            <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: { padding: 16 },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 45,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        paddingVertical: 8,
    },
    adminBtns: {
        flexDirection: 'row',
        gap: 8,
    },
    adminBtn: {
        width: 45,
        height: 45,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    categories: { marginBottom: 12 },
    catBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8, gap: 6 },
    catText: { fontSize: 13, fontWeight: '600' },
    card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, borderWidth: 1.5, elevation: 3 },
    cardContent: { flexDirection: 'row', padding: 18 },
    cardLeft: { flex: 1 },
    itemName: { fontSize: 16, fontWeight: '700' },
    itemPrice: { fontSize: 15, fontWeight: '700' },
    stockText: { fontSize: 12, fontWeight: '600' },
    itemDesc: { fontSize: 13, marginTop: 4 },
    cardRight: { justifyContent: 'center', alignItems: 'flex-end' },
    addBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 6 },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    qtyControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 4 },
    qtyBtn: { padding: 6 },
    qtyText: { color: '#FFF', fontWeight: '700', minWidth: 20, textAlign: 'center' },
    cartBar: { position: 'absolute', bottom: 20, left: 20, right: 20, borderRadius: 15, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 10 },
    cartInfo: { flex: 1 },
    cartCount: { color: '#FFF', fontSize: 12 },
    cartTotal: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    viewCart: { color: '#FFF', fontWeight: '700' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    cartItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#CCC' },
    summary: { marginTop: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    primaryBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
    paymentGrid: { flexDirection: 'row', gap: 10 },
    payBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
    catTiny: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, marginRight: 8 },
    empty: { textAlign: 'center', marginTop: 50 },
    servingModal: { marginHorizontal: 30, padding: 25, borderRadius: 20 },
    servingBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1.5 },
    qrSection: {
        alignItems: 'center',
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
    },
    qrContainer: {
        padding: 10,
        backgroundColor: '#FFF',
        borderRadius: 10,
        marginBottom: 10,
    },
    qrText: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 5,
    },
    upiIdText: {
        fontSize: 13,
        fontWeight: '800',
    },
});

export default BarScreen;
