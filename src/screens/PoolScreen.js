import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    Dimensions,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import QRCode from 'react-native-qrcode-svg';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { getPoolTypes, addPoolType, updatePoolType, deletePoolType, savePoolOrder, UPI_ID, getUPIString, getTaxByService, calculateTax } from '../utils/api';
import { SlideUp, FadeIn } from '../utils/animations';

// Lottie animation
const PoolLoadingAnimation = require('../assets/pool.json');

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Pool colors
const POOL_COLORS = {
    kids: '#06B6D4',    // Cyan
    adults: '#3B82F6',  // Blue
};

const PoolScreen = ({ route, navigation }) => {
    const { colors } = useTheme();
    const { customer } = route.params || {};

    // Pool types state
    const [poolTypes, setPoolTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Selection state - use quantities per pool type instead of single selection
    const [poolQuantities, setPoolQuantities] = useState({});
    const [preferredTime, setPreferredTime] = useState('');

    // Modal states
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showAddEditModal, setShowAddEditModal] = useState(false);

    // Form states
    const [editingType, setEditingType] = useState(null);
    const [typeName, setTypeName] = useState('');
    const [typeDescription, setTypeDescription] = useState('');
    const [typeAgeRange, setTypeAgeRange] = useState('');
    const [typePrice, setTypePrice] = useState('');
    const [typeIcon, setTypeIcon] = useState('swim');

    // Payment state
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [taxPercent, setTaxPercent] = useState(0); // Tax rate from admin settings

    // Load pool types
    const loadPoolTypes = useCallback(async (showLoading = true) => {
        const startTime = Date.now();

        if (showLoading && poolTypes.length === 0) {
            setIsLoading(true);
        }
        try {
            const [types, tax] = await Promise.all([
                getPoolTypes(),
                getTaxByService('pool'),
            ]);
            setPoolTypes(types);
            setTaxPercent(tax || 0);
        } catch (error) {
            console.error('Error loading pool types:', error);
            if (poolTypes.length === 0) {
                Alert.alert('Error', 'Could not load pool types. Check your connection.');
            }
        } finally {
            const elapsed = Date.now() - startTime;
            const minLoadTime = showLoading && poolTypes.length === 0 ? 3000 : 0;
            const remainingTime = Math.max(0, minLoadTime - elapsed);
            setTimeout(() => setIsLoading(false), remainingTime);
        }
    }, [poolTypes.length]);

    useEffect(() => {
        loadPoolTypes(true);
    }, []);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const intervalId = setInterval(() => {
            loadPoolTypes(false);
        }, 5000);
        return () => clearInterval(intervalId);
    }, [loadPoolTypes]);

    // Calculate total from all pool type quantities
    const totalAmount = useMemo(() => {
        return poolTypes.reduce((sum, type) => {
            const qty = poolQuantities[type.id] || 0;
            return sum + (qty * type.price);
        }, 0);
    }, [poolTypes, poolQuantities]);

    // Calculate tax breakdown
    const taxInfo = useMemo(() => {
        return calculateTax(totalAmount, taxPercent);
    }, [totalAmount, taxPercent]);

    // Check if any pool type is selected
    const hasSelection = useMemo(() => {
        return Object.values(poolQuantities).some(qty => qty > 0);
    }, [poolQuantities]);

    // Get selected types summary for display
    const selectionSummary = useMemo(() => {
        return poolTypes
            .filter(type => (poolQuantities[type.id] || 0) > 0)
            .map(type => `${type.name}: ${poolQuantities[type.id]}`)
            .join(', ');
    }, [poolTypes, poolQuantities]);

    // Reset form
    const resetForm = useCallback(() => {
        setTypeName('');
        setTypeDescription('');
        setTypeAgeRange('');
        setTypePrice('');
        setTypeIcon('swim');
        setEditingType(null);
    }, []);

    // Add pool type
    const handleAddType = useCallback(async () => {
        if (!typeName.trim()) {
            Alert.alert('Required', 'Please enter type name');
            return;
        }
        if (!typePrice || isNaN(Number(typePrice))) {
            Alert.alert('Required', 'Please enter a valid price');
            return;
        }

        try {
            await addPoolType({
                name: typeName.trim(),
                description: typeDescription.trim(),
                ageRange: typeAgeRange.trim(),
                price: Number(typePrice),
                icon: typeIcon,
            });
            resetForm();
            setShowAddEditModal(false);
            loadPoolTypes();
            Alert.alert('Success', 'Pool type added!');
        } catch (error) {
            Alert.alert('Error', 'Failed to add pool type');
        }
    }, [typeName, typeDescription, typeAgeRange, typePrice, typeIcon, resetForm, loadPoolTypes]);

    // Edit pool type
    const handleEditType = useCallback(async () => {
        if (!typeName.trim()) {
            Alert.alert('Required', 'Please enter type name');
            return;
        }

        try {
            await updatePoolType(editingType.id, {
                name: typeName.trim(),
                description: typeDescription.trim(),
                ageRange: typeAgeRange.trim(),
                price: Number(typePrice) || editingType.price,
                icon: typeIcon,
            });
            resetForm();
            setShowAddEditModal(false);
            loadPoolTypes();
            Alert.alert('Success', 'Pool type updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update pool type');
        }
    }, [typeName, typeDescription, typeAgeRange, typePrice, typeIcon, editingType, resetForm, loadPoolTypes]);

    // Delete pool type
    const handleDeleteType = useCallback((type) => {
        Alert.alert(
            'Delete Pool Type',
            `Are you sure you want to delete "${type.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deletePoolType(type.id);
                        loadPoolTypes();
                        // Clear quantity if deleted type had any
                        if (poolQuantities[type.id]) {
                            setPoolQuantities(prev => {
                                const updated = { ...prev };
                                delete updated[type.id];
                                return updated;
                            });
                        }
                    },
                },
            ]
        );
    }, [loadPoolTypes, poolQuantities]);

    // Increment pool type quantity
    const incrementQuantity = useCallback((typeId) => {
        setPoolQuantities(prev => ({
            ...prev,
            [typeId]: (prev[typeId] || 0) + 1,
        }));
    }, []);

    // Decrement pool type quantity
    const decrementQuantity = useCallback((typeId) => {
        setPoolQuantities(prev => {
            const current = prev[typeId] || 0;
            if (current <= 0) return prev;
            return {
                ...prev,
                [typeId]: current - 1,
            };
        });
    }, []);

    // Open edit modal
    const openEditModal = useCallback((type) => {
        setEditingType(type);
        setTypeName(type.name);
        setTypeDescription(type.description || '');
        setTypeAgeRange(type.ageRange || '');
        setTypePrice(String(type.price));
        setTypeIcon(type.icon || 'swim');
        setShowAddEditModal(true);
    }, []);

    // Open add modal
    const openAddModal = useCallback(() => {
        resetForm();
        setShowAddEditModal(true);
    }, [resetForm]);



    // Proceed to checkout
    const handleProceedToPayment = useCallback(() => {
        if (!hasSelection) {
            Alert.alert('Select Pool', 'Please add at least one person to a pool type');
            return;
        }
        setShowPaymentModal(true);
        setSelectedPaymentMethod(null);
    }, [hasSelection]);

    // Complete payment
    const completePayment = useCallback(async () => {
        if (!selectedPaymentMethod) {
            Alert.alert('Select Payment', 'Please select a payment method');
            return;
        }

        const paymentType = selectedPaymentMethod === 'qr' ? 'UPI/QR' : 'Cash';

        // Build order items from quantities
        const orderItems = poolTypes
            .filter(type => (poolQuantities[type.id] || 0) > 0)
            .map(type => ({
                typeId: type.id,
                typeName: type.name,
                quantity: poolQuantities[type.id],
                pricePerPerson: type.price,
                subtotal: type.price * poolQuantities[type.id],
            }));

        try {
            await savePoolOrder({
                customerId: customer?.customerId || customer?.id,
                customerName: customer?.name || 'Walk-in',
                customerMobile: customer?.mobile || '',
                items: orderItems,
                preferredTime: preferredTime.trim() || null,
                subtotal: taxInfo.subtotal,
                taxPercent: taxInfo.taxPercent,
                taxAmount: taxInfo.taxAmount,
                totalAmount: taxInfo.total,
                paymentMethod: paymentType,
                service: 'Pool',
            });

            Alert.alert(
                '✅ Booking Confirmed',
                `Pool booking confirmed!\n\n${selectionSummary}\nTotal: ₹${taxInfo.total}\nPayment: ${paymentType}${taxInfo.taxAmount > 0 ? `\nTax (${taxInfo.taxPercent}%): ₹${taxInfo.taxAmount}` : ''}`,
                [
                    {
                        text: 'Done',
                        onPress: () => {
                            setShowPaymentModal(false);
                            setPoolQuantities({});
                            setPreferredTime('');
                            setSelectedPaymentMethod(null);
                            navigation.goBack();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Error saving pool order:', error);
            Alert.alert('Error', 'Failed to save booking');
        }
    }, [selectedPaymentMethod, poolTypes, poolQuantities, preferredTime, totalAmount, selectionSummary, customer, navigation]);

    // Go back
    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    // Render pool type card with quantity counter
    const renderPoolTypeCard = ({ item: type }) => {
        const quantity = poolQuantities[type.id] || 0;
        const hasQuantity = quantity > 0;
        const iconName = type.icon || (type.name.toLowerCase().includes('kid') ? 'human-child' : 'swim');
        const bgColor = type.name.toLowerCase().includes('kid') ? POOL_COLORS.kids : POOL_COLORS.adults;

        return (
            <View
                style={[
                    styles.poolTypeCard,
                    {
                        backgroundColor: hasQuantity ? bgColor : colors.card,
                        borderColor: bgColor,
                        borderWidth: hasQuantity ? 3 : 2,
                    },
                ]}
            >
                <View style={[styles.poolTypeIcon, { backgroundColor: hasQuantity ? 'rgba(255,255,255,0.2)' : bgColor + '20' }]}>
                    <Icon name={iconName} size={36} color={hasQuantity ? '#FFFFFF' : bgColor} />
                </View>
                <Text style={[styles.poolTypeName, { color: hasQuantity ? '#FFFFFF' : colors.textPrimary }]}>
                    {type.name}
                </Text>
                <Text style={[styles.poolTypeAge, { color: hasQuantity ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                    {type.ageRange ? `Age: ${type.ageRange}` : type.description}
                </Text>
                <Text style={[styles.poolTypePrice, { color: hasQuantity ? '#FFFFFF' : bgColor }]}>
                    ₹{type.price}/person
                </Text>

                {/* Quantity Counter */}
                <View style={styles.quantityContainer}>
                    <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: quantity > 0 ? 'rgba(255,255,255,0.3)' : colors.border }]}
                        onPress={() => decrementQuantity(type.id)}
                        disabled={quantity <= 0}
                    >
                        <Icon name="minus" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={[styles.qtyValue, { color: hasQuantity ? '#FFFFFF' : colors.textPrimary }]}>
                        {quantity}
                    </Text>
                    <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: hasQuantity ? 'rgba(255,255,255,0.3)' : bgColor }]}
                        onPress={() => incrementQuantity(type.id)}
                    >
                        <Icon name="plus" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {hasQuantity && (
                    <Text style={styles.subtotalText}>
                        Subtotal: ₹{type.price * quantity}
                    </Text>
                )}
            </View>
        );
    };

    // Render header
    const renderHeader = () => (
        <View style={styles.headerContent}>
            {customer && (
                <SlideUp delay={100}>
                    <View style={[styles.customerBanner, { backgroundColor: colors.card, borderColor: colors.brand }]}>
                        <View style={[styles.customerAvatar, { backgroundColor: colors.brand }]}>
                            <Icon name="account" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.customerDetails}>
                            <Text style={[styles.customerName, { color: colors.textPrimary }]}>{customer.name}</Text>
                            <Text style={[styles.customerMobile, { color: colors.textSecondary }]}>{customer.mobile}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.historyBtn, { backgroundColor: colors.accent }]}
                            onPress={() => navigation.navigate('CustomerHistory', { customer })}
                        >
                            <Icon name="history" size={18} color="#FFFFFF" />
                            <Text style={styles.historyBtnText}>History</Text>
                        </TouchableOpacity>
                    </View>
                </SlideUp>
            )}

            <FadeIn delay={200}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Select Pool Type</Text>
                    <TouchableOpacity
                        style={[styles.manageBtn, { backgroundColor: colors.accent }]}
                        onPress={() => setShowManageModal(true)}
                    >
                        <Icon name="cog" size={18} color="#FFFFFF" />
                        <Text style={styles.manageBtnText}>Manage</Text>
                    </TouchableOpacity>
                </View>
            </FadeIn>
        </View>
    );

    // Payment Modal
    const renderPaymentModal = () => (
        <Modal visible={showPaymentModal} transparent animationType="slide">
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Payment</Text>
                        <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                            <Icon name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Booking Summary */}
                    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Booking Summary</Text>
                        {poolTypes.filter(type => (poolQuantities[type.id] || 0) > 0).map(type => (
                            <View key={type.id} style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                                    {type.name} × {poolQuantities[type.id]}
                                </Text>
                                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                                    ₹{type.price * poolQuantities[type.id]}
                                </Text>
                            </View>
                        ))}
                        {preferredTime ? (
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Preferred Time</Text>
                                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{preferredTime}</Text>
                            </View>
                        ) : null}
                        <View style={[styles.summaryTotal, { borderTopColor: colors.border }]}>
                            <Text style={[styles.summaryTotalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                            <Text style={[styles.summaryTotalValue, { color: colors.textPrimary }]}>₹{taxInfo.subtotal}</Text>
                        </View>
                        {taxInfo.taxPercent > 0 && (
                            <View style={[styles.summaryTotal, { marginTop: 4 }]}>
                                <Text style={[styles.summaryTotalLabel, { color: colors.textSecondary }]}>Tax ({taxInfo.taxPercent}%)</Text>
                                <Text style={[styles.summaryTotalValue, { color: colors.textSecondary }]}>₹{taxInfo.taxAmount}</Text>
                            </View>
                        )}
                        <View style={[styles.summaryTotal, { marginTop: 8 }]}>
                            <Text style={[styles.summaryTotalLabel, { color: colors.textPrimary, fontWeight: '700' }]}>Total</Text>
                            <Text style={[styles.summaryTotalValue, { color: colors.brand }]}>₹{taxInfo.total}</Text>
                        </View>
                    </View>

                    {/* Payment Methods */}
                    <Text style={[styles.paymentLabel, { color: colors.textPrimary }]}>Select Payment Method</Text>
                    <View style={styles.paymentOptions}>
                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                {
                                    backgroundColor: selectedPaymentMethod === 'cash' ? '#10B981' : colors.surface,
                                    borderColor: '#10B981',
                                },
                            ]}
                            onPress={() => setSelectedPaymentMethod('cash')}
                        >
                            <Icon name="cash" size={28} color={selectedPaymentMethod === 'cash' ? '#FFFFFF' : '#10B981'} />
                            <Text style={[styles.paymentOptionText, { color: selectedPaymentMethod === 'cash' ? '#FFFFFF' : colors.textPrimary }]}>
                                Cash
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                {
                                    backgroundColor: selectedPaymentMethod === 'qr' ? '#8B5CF6' : colors.surface,
                                    borderColor: '#8B5CF6',
                                },
                            ]}
                            onPress={() => setSelectedPaymentMethod('qr')}
                        >
                            <Icon name="qrcode-scan" size={28} color={selectedPaymentMethod === 'qr' ? '#FFFFFF' : '#8B5CF6'} />
                            <Text style={[styles.paymentOptionText, { color: selectedPaymentMethod === 'qr' ? '#FFFFFF' : colors.textPrimary }]}>
                                UPI/QR (₹{taxInfo.total})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* QR Code */}
                    {selectedPaymentMethod === 'qr' && (
                        <View style={styles.qrContainer}>
                            <QRCode value={getUPIString(taxInfo.total)} size={150} backgroundColor="white" />
                            <Text style={[styles.qrScanText, { color: colors.textPrimary }]}>Scan to pay ₹{taxInfo.total}</Text>
                        </View>
                    )}

                    {/* Confirm Button */}
                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: colors.brand, opacity: selectedPaymentMethod ? 1 : 0.5 }]}
                        onPress={completePayment}
                        disabled={!selectedPaymentMethod}
                    >
                        <Icon name="check" size={20} color="#FFFFFF" />
                        <Text style={styles.confirmBtnText}>Confirm Payment</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Manage Modal
    const renderManageModal = () => (
        <Modal visible={showManageModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Manage Pool Types</Text>
                        <TouchableOpacity onPress={() => setShowManageModal(false)}>
                            <Icon name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.addTypeBtn, { backgroundColor: colors.accent }]}
                        onPress={() => {
                            setShowManageModal(false);
                            openAddModal();
                        }}
                    >
                        <Icon name="plus" size={20} color="#FFFFFF" />
                        <Text style={styles.addTypeBtnText}>Add Pool Type</Text>
                    </TouchableOpacity>

                    <ScrollView style={styles.typesList}>
                        {poolTypes.map((type) => (
                            <View key={type.id} style={[styles.typeListItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={styles.typeListInfo}>
                                    <Icon name={type.icon || 'swim'} size={24} color={colors.brand} />
                                    <View style={styles.typeListText}>
                                        <Text style={[styles.typeListName, { color: colors.textPrimary }]}>{type.name}</Text>
                                        <Text style={[styles.typeListPrice, { color: colors.textSecondary }]}>₹{type.price}/person</Text>
                                    </View>
                                </View>
                                <View style={styles.typeListActions}>
                                    <TouchableOpacity
                                        style={[styles.typeActionBtn, { backgroundColor: colors.brand }]}
                                        onPress={() => {
                                            setShowManageModal(false);
                                            openEditModal(type);
                                        }}
                                    >
                                        <Icon name="pencil" size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.typeActionBtn, { backgroundColor: colors.error }]}
                                        onPress={() => handleDeleteType(type)}
                                    >
                                        <Icon name="delete" size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Add/Edit Modal
    const renderAddEditModal = () => (
        <Modal visible={showAddEditModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            {editingType ? 'Edit Pool Type' : 'Add Pool Type'}
                        </Text>
                        <TouchableOpacity onPress={() => { setShowAddEditModal(false); resetForm(); }}>
                            <Icon name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Type Name *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                value={typeName}
                                onChangeText={setTypeName}
                                placeholder="e.g., Kids Pool, Adults Pool"
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Age Range</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                value={typeAgeRange}
                                onChangeText={setTypeAgeRange}
                                placeholder="e.g., 4-12, 12+"
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                value={typeDescription}
                                onChangeText={setTypeDescription}
                                placeholder="Brief description"
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Price per Person (₹) *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                value={typePrice}
                                onChangeText={setTypePrice}
                                placeholder="Enter price"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Icon Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Icon</Text>
                            <View style={styles.iconOptions}>
                                {['swim', 'human-child', 'pool', 'wave'].map((icon) => (
                                    <TouchableOpacity
                                        key={icon}
                                        style={[
                                            styles.iconOption,
                                            {
                                                backgroundColor: typeIcon === icon ? colors.brand : colors.surface,
                                                borderColor: colors.brand,
                                            },
                                        ]}
                                        onPress={() => setTypeIcon(icon)}
                                    >
                                        <Icon name={icon} size={24} color={typeIcon === icon ? '#FFFFFF' : colors.brand} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, { backgroundColor: colors.brand }]}
                            onPress={editingType ? handleEditType : handleAddType}
                        >
                            <Icon name={editingType ? 'check' : 'plus'} size={20} color="#FFFFFF" />
                            <Text style={styles.submitBtnText}>{editingType ? 'Update' : 'Add'} Pool Type</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Pool" subtitle="Swimming Pool Access" showTypewriter={true} />
                <View style={styles.loadingContainer}>
                    <LottieView source={PoolLoadingAnimation} autoPlay loop style={styles.lottieAnimation} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Pool...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Pool" subtitle="Swimming Pool Access" showTypewriter={true} />

            {/* Back Button */}
            <View style={styles.topBar}>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={handleGoBack}>
                    <Icon name="arrow-left" size={22} color={colors.textPrimary} />
                    <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>Back</Text>
                </TouchableOpacity>
            </View>

            {/* Pool Types Grid */}
            <FlatList
                data={poolTypes}
                keyExtractor={(item) => item.id}
                renderItem={renderPoolTypeCard}
                numColumns={2}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
            />

            {/* Bottom Booking Panel */}
            <View style={[styles.bottomPanel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                {/* Preferred Time (Optional) */}
                <View style={styles.timeSection}>
                    <TextInput
                        style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Preferred time (optional)"
                        placeholderTextColor={colors.textMuted}
                        value={preferredTime}
                        onChangeText={setPreferredTime}
                    />
                </View>

                {/* Total & Book Button */}
                <View style={styles.bookingRow}>
                    <View style={styles.totalInfo}>
                        <Text style={[styles.totalLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                            {hasSelection ? selectionSummary : 'Add people to pool types'}
                        </Text>
                        <Text style={[styles.totalAmount, { color: colors.brand }]}>₹{taxInfo.total}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.bookBtn, { backgroundColor: hasSelection ? colors.brand : colors.border }]}
                        onPress={handleProceedToPayment}
                        disabled={!hasSelection}
                    >
                        <Icon name="pool" size={20} color="#FFFFFF" />
                        <Text style={styles.bookBtnText}>Book Now</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Modals */}
            {renderPaymentModal()}
            {renderManageModal()}
            {renderAddEditModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
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
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    headerContent: {
        paddingHorizontal: 4,
    },
    customerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginHorizontal: 4,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    customerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    customerDetails: {
        flex: 1,
    },
    customerName: {
        fontSize: 17,
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 4,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    manageBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    listContent: {
        paddingHorizontal: 8,
        paddingBottom: 200,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    poolTypeCard: {
        flex: 1,
        margin: 6,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        minHeight: 240,
        position: 'relative',
    },
    poolTypeIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    poolTypeName: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    poolTypeAge: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 8,
    },
    poolTypePrice: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    qtyBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyValue: {
        fontSize: 22,
        fontWeight: '700',
        marginHorizontal: 16,
        minWidth: 30,
        textAlign: 'center',
    },
    subtotalText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 6,
        opacity: 0.9,
    },
    selectedBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    bottomPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    counterSection: {
        marginBottom: 12,
    },
    counterLabel: {
        fontSize: 13,
        marginBottom: 8,
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterValue: {
        fontSize: 28,
        fontWeight: '700',
        marginHorizontal: 30,
    },
    timeSection: {
        marginBottom: 12,
    },
    timeInput: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
    },
    bookingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalInfo: {
        flex: 1,
    },
    totalLabel: {
        fontSize: 12,
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '700',
    },
    bookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    bookBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        maxHeight: '85%',
        borderRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    summaryCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    summaryTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        marginTop: 8,
        borderTopWidth: 1,
    },
    summaryTotalLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    summaryTotalValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    paymentLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
    },
    paymentOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    paymentOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    paymentOptionText: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 6,
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    qrHint: {
        fontSize: 12,
        marginTop: 8,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
    addTypeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 16,
    },
    addTypeBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    typesList: {
        maxHeight: 300,
    },
    typeListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
    },
    typeListInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    typeListText: {
        marginLeft: 12,
    },
    typeListName: {
        fontSize: 15,
        fontWeight: '600',
    },
    typeListPrice: {
        fontSize: 13,
    },
    typeListActions: {
        flexDirection: 'row',
        gap: 8,
    },
    typeActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    iconOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconOption: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 8,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
});

export default PoolScreen;
