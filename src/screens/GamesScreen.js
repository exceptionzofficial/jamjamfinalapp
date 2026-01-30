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
import { getGames, addGame, updateGame, deleteGame, saveBooking, getCustomerBookings, formatDateTime, UPI_ID, getUPIString, getTaxByService, calculateTax } from '../utils/api';
import { SlideUp, FadeIn } from '../utils/animations';

// Lottie animation
const GamesLoadingAnimation = require('../assets/games icon.json');

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Border colors for game cards
const BORDER_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6',
    '#06B6D4', '#EF4444', '#F97316', '#6366F1', '#DC2626',
    '#14B8A6', '#A855F7', '#22C55E', '#0EA5E9', '#E11D48',
];

const GamesScreen = ({ route, navigation }) => {
    const { colors } = useTheme();
    const { customer } = route.params || {};

    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editingGame, setEditingGame] = useState(null);

    // View mode: 'grid' or 'list'
    const [viewMode, setViewMode] = useState('grid');

    // Edit/Delete mode states
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    // Payment states
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

    // History states
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [customerBookings, setCustomerBookings] = useState([]);

    // Form states
    const [gameName, setGameName] = useState('');
    const [gameCoins, setGameCoins] = useState('');
    const [gameMinutes, setGameMinutes] = useState('');
    const [gameRate, setGameRate] = useState('');
    const [taxPercent, setTaxPercent] = useState(0); // Tax rate from admin settings

    // Selected games for booking with coin counts
    const [selectedGames, setSelectedGames] = useState({});

    // Load games from cloud (LIVE) with minimum 5 second loading animation
    const loadGames = useCallback(async (showLoading = true) => {
        const startTime = Date.now();

        if (showLoading && games.length === 0) {
            setIsLoading(true);
        }
        try {
            const [freshGames, tax] = await Promise.all([
                getGames(),
                getTaxByService('games'),
            ]);

            // Set tax rate
            setTaxPercent(tax || 0);

            // Only update if data has actually changed (compare by ID list)
            setGames(prev => {
                const prevIds = prev.map(g => g.id || g.gameId).join(',');
                const newIds = freshGames.map(g => g.id || g.gameId).join(',');
                if (prevIds !== newIds || prev.length !== freshGames.length) {
                    return freshGames; // Data changed, update
                }
                return prev; // No change, keep same reference
            });
        } catch (error) {
            console.error('Error loading games:', error);
            if (games.length === 0) {
                Alert.alert('Error', 'Could not load games. Check your connection.');
            }
        } finally {
            // Ensure minimum 5 seconds loading animation
            const elapsed = Date.now() - startTime;
            const minLoadTime = showLoading && games.length === 0 ? 5000 : 0;
            const remainingTime = Math.max(0, minLoadTime - elapsed);

            setTimeout(() => {
                setIsLoading(false);
            }, remainingTime);
        }
    }, [games.length]);

    // Initial load
    useEffect(() => {
        loadGames(true);
    }, []);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const intervalId = setInterval(() => {
            loadGames(false); // Don't show loading spinner for background refresh
        }, 5000);

        return () => clearInterval(intervalId);
    }, [loadGames]);

    const resetForm = useCallback(() => {
        setGameName('');
        setGameCoins('');
        setGameMinutes('');
        setGameRate('');
    }, []);

    const handleAddGame = useCallback(async () => {
        if (!gameName.trim()) {
            Alert.alert('Required', 'Please enter game name');
            return;
        }
        if (!gameMinutes.trim() || isNaN(Number(gameMinutes))) {
            Alert.alert('Required', 'Please enter valid minutes');
            return;
        }
        if (!gameRate.trim() || isNaN(Number(gameRate))) {
            Alert.alert('Required', 'Please enter a valid rate');
            return;
        }

        try {
            await addGame({
                name: gameName.trim(),
                coins: gameCoins.trim() || '-',
                minutes: Number(gameMinutes),
                rate: Number(gameRate),
            });
            resetForm();
            setShowAddModal(false);
            loadGames();
            Alert.alert('Success', 'Game added successfully!');
        } catch {
            Alert.alert('Error', 'Failed to add game');
        }
    }, [gameName, gameCoins, gameMinutes, gameRate, resetForm, loadGames]);

    const openEditModal = useCallback((game) => {
        setEditingGame(game);
        setGameName(game.name);
        setGameCoins(String(game.coins));
        setGameMinutes(String(game.minutes));
        setGameRate(String(game.rate));
        setShowEditModal(true);
        setIsEditMode(false);
    }, []);

    const handleEditGame = useCallback(async () => {
        if (!gameName.trim()) {
            Alert.alert('Required', 'Please enter game name');
            return;
        }

        try {
            await updateGame(editingGame.id, {
                name: gameName.trim(),
                coins: gameCoins.trim() || '-',
                minutes: Number(gameMinutes) || editingGame.minutes,
                rate: Number(gameRate) || editingGame.rate,
            });
            resetForm();
            setShowEditModal(false);
            setEditingGame(null);
            loadGames();
            Alert.alert('Success', 'Game updated successfully!');
        } catch {
            Alert.alert('Error', 'Failed to update game');
        }
    }, [gameName, gameCoins, gameMinutes, gameRate, editingGame, resetForm, loadGames]);

    const handleDeleteGame = useCallback((game) => {
        Alert.alert(
            'Delete Game',
            `Are you sure you want to delete "${game.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteGame(game.id);
                        loadGames();
                        setIsDeleteMode(false);
                    },
                },
            ]
        );
    }, [loadGames]);

    const handleCardPress = useCallback((game) => {
        if (isEditMode) {
            openEditModal(game);
        } else if (isDeleteMode) {
            handleDeleteGame(game);
        }
    }, [isEditMode, isDeleteMode, openEditModal, handleDeleteGame]);

    const toggleEditMode = useCallback(() => {
        setIsEditMode(prev => !prev);
        setIsDeleteMode(false);
    }, []);

    const toggleDeleteMode = useCallback(() => {
        setIsDeleteMode(prev => !prev);
        setIsEditMode(false);
    }, []);

    const toggleViewMode = useCallback(() => {
        setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
    }, []);

    const addCoin = useCallback((gameId, game) => {
        if (isEditMode || isDeleteMode) return;
        setSelectedGames((prev) => {
            const current = prev[gameId] || { game, coinCount: 0 };
            return {
                ...prev,
                [gameId]: {
                    ...current,
                    game,
                    coinCount: current.coinCount + 1,
                },
            };
        });
    }, [isEditMode, isDeleteMode]);

    const removeCoin = useCallback((gameId) => {
        if (isEditMode || isDeleteMode) return;
        setSelectedGames((prev) => {
            const current = prev[gameId];
            if (!current || current.coinCount <= 0) return prev;

            if (current.coinCount === 1) {
                const newState = { ...prev };
                delete newState[gameId];
                return newState;
            }

            return {
                ...prev,
                [gameId]: {
                    ...current,
                    coinCount: current.coinCount - 1,
                },
            };
        });
    }, [isEditMode, isDeleteMode]);

    const totals = useMemo(() => {
        let coins = 0;
        let amount = 0;
        Object.values(selectedGames).forEach((item) => {
            coins += item.coinCount;
            amount += item.game.rate * item.coinCount;
        });
        return { coins, amount };
    }, [selectedGames]);

    // Calculate tax breakdown
    const taxInfo = useMemo(() => {
        return calculateTax(totals.amount, taxPercent);
    }, [totals.amount, taxPercent]);

    const hasSelection = Object.keys(selectedGames).length > 0;
    const handleConfirmBooking = useCallback(() => {
        const items = Object.values(selectedGames);
        if (items.length === 0) {
            Alert.alert('No Games', 'Please add coins to games first');
            return;
        }
        // Open payment modal instead of direct confirm
        setShowPaymentModal(true);
        setSelectedPaymentMethod(null);
    }, [selectedGames]);

    const handlePayment = useCallback((method) => {
        setSelectedPaymentMethod(method);
    }, []);

    const completePayment = useCallback(async () => {
        if (!selectedPaymentMethod) {
            Alert.alert('Select Payment', 'Please select a payment method');
            return;
        }

        const paymentType = selectedPaymentMethod === 'qr' ? 'UPI/QR' : 'Cash';

        // Save booking to history
        const bookingItems = Object.values(selectedGames).map(item => ({
            gameName: item.game.name,
            coinCount: item.coinCount,
            rate: item.game.rate,
            subtotal: item.game.rate * item.coinCount,
        }));

        try {
            await saveBooking({
                customerId: customer?.customerId || customer?.id,
                customerName: customer?.name || 'Walk-in',
                customerMobile: customer?.mobile || '',
                items: bookingItems,
                subtotal: taxInfo.subtotal,
                taxPercent: taxInfo.taxPercent,
                taxAmount: taxInfo.taxAmount,
                totalAmount: taxInfo.total,
                totalCoins: totals.coins,
                paymentMethod: paymentType,
                service: 'Games',
            });
        } catch (error) {
            console.error('Error saving booking:', error);
        }

        Alert.alert(
            'Payment Successful',
            `Payment of ₹${taxInfo.total} received via ${paymentType}${taxInfo.taxAmount > 0 ? `\n(Includes ${taxInfo.taxPercent}% tax: ₹${taxInfo.taxAmount})` : ''}.\n\nBooking confirmed for ${customer?.name || 'Walk-in'}!`,
            [
                {
                    text: 'Done',
                    onPress: () => {
                        setShowPaymentModal(false);
                        setSelectedGames({});
                        setSelectedPaymentMethod(null);
                        navigation.goBack();
                    }
                }
            ]
        );
    }, [selectedPaymentMethod, selectedGames, totals, customer, navigation]);

    const closePaymentModal = useCallback(() => {
        setShowPaymentModal(false);
        setSelectedPaymentMethod(null);
    }, []);

    // History functions
    const openHistory = useCallback(() => {
        navigation.navigate('CustomerHistory', { customer });
    }, [customer, navigation]);

    const closeHistoryModal = useCallback(() => {
        setShowHistoryModal(false);
    }, []);

    const closeAddModal = useCallback(() => {
        resetForm();
        setShowAddModal(false);
    }, [resetForm]);

    const closeEditModal = useCallback(() => {
        resetForm();
        setShowEditModal(false);
        setEditingGame(null);
    }, [resetForm]);

    const openAddModal = useCallback(() => {
        setShowAddModal(true);
        setIsEditMode(false);
        setIsDeleteMode(false);
    }, []);

    // Go back to service selection screen (not customer selection)
    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    // Render Grid Item
    const renderGridItem = useCallback(({ item: game, index }) => {
        const coinCount = selectedGames[game.id]?.coinCount || 0;
        const isSelected = coinCount > 0;
        const borderColor = BORDER_COLORS[index % BORDER_COLORS.length];
        const isInActionMode = isEditMode || isDeleteMode;

        return (
            <View style={styles.gameCardWrapper}>
                <TouchableOpacity
                    style={[
                        styles.gameCard,
                        {
                            backgroundColor: colors.card,
                            borderColor: isEditMode ? colors.brand : isDeleteMode ? colors.error : borderColor,
                            borderWidth: isInActionMode ? 3 : 2,
                        }
                    ]}
                    onPress={() => handleCardPress(game)}
                    activeOpacity={isInActionMode ? 0.7 : 1}
                    disabled={!isInActionMode}
                >
                    {isInActionMode && (
                        <View style={[styles.modeIndicator, { backgroundColor: isEditMode ? colors.brand : colors.error }]}>
                            <Icon name={isEditMode ? 'pencil' : 'delete'} size={14} color="#FFFFFF" />
                        </View>
                    )}

                    <Text style={[styles.gameCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {game.name}
                    </Text>

                    <View style={styles.gameCardDetails}>
                        <View style={[styles.detailChip, { backgroundColor: colors.surfaceLight }]}>
                            <Icon name="circle-multiple" size={11} color={borderColor} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>{game.coins} coin</Text>
                        </View>
                        <View style={[styles.detailChip, { backgroundColor: colors.surfaceLight }]}>
                            <Icon name="clock-outline" size={11} color={borderColor} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>{game.minutes} min</Text>
                        </View>
                    </View>

                    <Text style={[styles.priceText, { color: borderColor }]}>₹{game.rate}</Text>

                    {!isInActionMode && (
                        <View style={styles.coinControlsRow}>
                            <TouchableOpacity
                                style={[styles.coinBtn, { backgroundColor: coinCount > 0 ? colors.error : colors.border }]}
                                onPress={() => removeCoin(game.id)}
                                disabled={coinCount <= 0}
                            >
                                <Icon name="minus" size={16} color="#FFFFFF" />
                            </TouchableOpacity>

                            <View style={[styles.coinCountBox, { backgroundColor: isSelected ? colors.brand : colors.surfaceLight, borderColor }]}>
                                <Text style={[styles.coinCountText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                                    {coinCount}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.coinBtn, { backgroundColor: colors.success }]}
                                onPress={() => addCoin(game.id, game)}
                            >
                                <Icon name="plus" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {isInActionMode && (
                        <Text style={[styles.tapHint, { color: isEditMode ? colors.brand : colors.error }]}>
                            Tap to {isEditMode ? 'edit' : 'delete'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    }, [colors, selectedGames, isEditMode, isDeleteMode, handleCardPress, addCoin, removeCoin]);

    // Render List Item
    const renderListItem = useCallback(({ item: game, index }) => {
        const coinCount = selectedGames[game.id]?.coinCount || 0;
        const isSelected = coinCount > 0;
        const borderColor = BORDER_COLORS[index % BORDER_COLORS.length];
        const isInActionMode = isEditMode || isDeleteMode;

        return (
            <TouchableOpacity
                style={[
                    styles.listItem,
                    {
                        backgroundColor: colors.card,
                        borderLeftColor: borderColor,
                        borderColor: isInActionMode ? (isEditMode ? colors.brand : colors.error) : colors.border,
                    }
                ]}
                onPress={() => handleCardPress(game)}
                activeOpacity={isInActionMode ? 0.7 : 1}
                disabled={!isInActionMode}
            >
                <View style={styles.listItemInfo}>
                    <Text style={[styles.listItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {game.name}
                    </Text>
                    <View style={styles.listItemDetails}>
                        <Text style={[styles.listItemDetail, { color: colors.textSecondary }]}>
                            {game.coins} coin • {game.minutes} min
                        </Text>
                    </View>
                </View>

                <Text style={[styles.listItemPrice, { color: borderColor }]}>₹{game.rate}</Text>

                {!isInActionMode ? (
                    <View style={styles.listCoinControls}>
                        <TouchableOpacity
                            style={[styles.listCoinBtn, { backgroundColor: coinCount > 0 ? colors.error : colors.border }]}
                            onPress={() => removeCoin(game.id)}
                            disabled={coinCount <= 0}
                        >
                            <Icon name="minus" size={14} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={[styles.listCoinCount, { backgroundColor: isSelected ? colors.brand : colors.surfaceLight }]}>
                            <Text style={[styles.listCoinText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                                {coinCount}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.listCoinBtn, { backgroundColor: colors.success }]}
                            onPress={() => addCoin(game.id, game)}
                        >
                            <Icon name="plus" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.actionIndicator, { backgroundColor: isEditMode ? colors.brand : colors.error }]}>
                        <Icon name={isEditMode ? 'pencil' : 'delete'} size={16} color="#FFFFFF" />
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [colors, selectedGames, isEditMode, isDeleteMode, handleCardPress, addCoin, removeCoin]);

    const renderHeader = useCallback(() => (
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
                            onPress={openHistory}
                        >
                            <Icon name="history" size={18} color="#FFFFFF" />
                            <Text style={styles.historyBtnText}>History</Text>
                        </TouchableOpacity>
                    </View>
                </SlideUp>
            )}

            <FadeIn delay={200}>
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.brand, borderWidth: 1 }]}>
                        <Icon name="gamepad-variant" size={22} color={colors.brand} />
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{games.length}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Games</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.accent, borderWidth: 1 }]}>
                        <Icon name="circle-multiple" size={22} color={colors.accent} />
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totals.coins}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Coins</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: '#10B981', borderWidth: 1 }]}>
                        <Icon name="currency-inr" size={22} color="#10B981" />
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>₹{totals.amount}</Text>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
                    </View>
                </View>
            </FadeIn>

            <SlideUp delay={300}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Available Games</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: isEditMode ? colors.brand : colors.surfaceLight }]}
                            onPress={toggleEditMode}
                        >
                            <Icon name="pencil" size={18} color={isEditMode ? '#FFFFFF' : colors.brand} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: isDeleteMode ? colors.error : colors.surfaceLight }]}
                            onPress={toggleDeleteMode}
                        >
                            <Icon name="delete" size={18} color={isDeleteMode ? '#FFFFFF' : colors.error} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.accent }]}
                            onPress={openAddModal}
                        >
                            <Icon name="plus" size={18} color="#FFFFFF" />
                            <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {(isEditMode || isDeleteMode) && (
                    <View style={[styles.modeBanner, { backgroundColor: isEditMode ? colors.brand : colors.error }]}>
                        <Icon name={isEditMode ? 'pencil' : 'delete'} size={16} color="#FFFFFF" />
                        <Text style={styles.modeBannerText}>
                            {isEditMode ? 'Tap any game to edit' : 'Tap any game to delete'}
                        </Text>
                        <TouchableOpacity onPress={() => { setIsEditMode(false); setIsDeleteMode(false); }}>
                            <Icon name="close" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </SlideUp>
        </View>
    ), [customer, colors, games.length, totals, openAddModal, isEditMode, isDeleteMode, toggleEditMode, toggleDeleteMode, openHistory]);

    const numColumns = viewMode === 'grid' ? (isTablet ? 4 : 2) : 1;

    // Loading Screen with Lottie Animation
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Games" subtitle="Arcade & Entertainment" showTypewriter={true} />
                <View style={styles.loadingContainer}>
                    <LottieView
                        source={GamesLoadingAnimation}
                        autoPlay
                        loop
                        style={styles.lottieAnimation}
                    />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading Games...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Games" subtitle="Arcade & Entertainment" showTypewriter={true} />

            {/* Top Bar with Back and View Toggle */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    style={[styles.backBtn, { backgroundColor: colors.card }]}
                    onPress={handleGoBack}
                >
                    <Icon name="arrow-left" size={22} color={colors.textPrimary} />
                    <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.viewToggleBtn, { backgroundColor: colors.card }]}
                    onPress={toggleViewMode}
                >
                    <Icon
                        name={viewMode === 'grid' ? 'view-list' : 'view-grid'}
                        size={22}
                        color={colors.brand}
                    />
                </TouchableOpacity>
            </View>

            {/* Games List/Grid */}
            <FlatList
                data={games}
                keyExtractor={(item) => item.id}
                renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
                numColumns={numColumns}
                key={`${viewMode}-${numColumns}`}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={viewMode === 'grid' && numColumns > 1 ? styles.columnWrapper : undefined}
                showsVerticalScrollIndicator={false}
                extraData={[selectedGames, isEditMode, isDeleteMode, viewMode]}
            />

            {/* Bottom Total Bar */}
            {totals.coins > 0 && !isEditMode && !isDeleteMode && (
                <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <View style={styles.totalInfo}>
                        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                            {totals.coins} coin(s) selected
                        </Text>
                        <View style={styles.totalRow}>
                            <Text style={[styles.totalText, { color: colors.textPrimary }]}>Total: </Text>
                            <Text style={[styles.totalAmount, { color: colors.brand }]}>₹{taxInfo.total}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: colors.brand }]}
                        onPress={handleConfirmBooking}
                    >
                        <Icon name="check" size={20} color="#FFFFFF" />
                        <Text style={styles.confirmBtnText}>Confirm</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Add Modal */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add New Game</Text>
                            <TouchableOpacity onPress={closeAddModal}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Game Name *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                    value={gameName}
                                    onChangeText={setGameName}
                                    placeholder="Enter game name"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Coins</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                    value={gameCoins}
                                    onChangeText={setGameCoins}
                                    placeholder="e.g., 1, 2, -, Ticket"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Minutes *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                    value={gameMinutes}
                                    onChangeText={setGameMinutes}
                                    placeholder="Enter play time"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rate (₹) *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                    value={gameRate}
                                    onChangeText={setGameRate}
                                    placeholder="Enter rate"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: colors.brand }]}
                                onPress={handleAddGame}
                            >
                                <Icon name="plus" size={20} color="#FFFFFF" />
                                <Text style={styles.submitBtnText}>Add Game</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Edit Modal */}
            <Modal visible={showEditModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Game</Text>
                            <TouchableOpacity onPress={closeEditModal}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Game Name *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                    value={gameName}
                                    onChangeText={setGameName}
                                    placeholder="Enter game name"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Coins</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                    value={gameCoins}
                                    onChangeText={setGameCoins}
                                    placeholder="e.g., 1, 2, -, Ticket"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Minutes *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                    value={gameMinutes}
                                    onChangeText={setGameMinutes}
                                    placeholder="Enter play time"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rate (₹) *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                                    value={gameRate}
                                    onChangeText={setGameRate}
                                    placeholder="Enter rate"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: colors.brand }]}
                                onPress={handleEditGame}
                            >
                                <Icon name="check" size={20} color="#FFFFFF" />
                                <Text style={styles.submitBtnText}>Update Game</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Payment Modal */}
            <Modal visible={showPaymentModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.paymentModalContent, { backgroundColor: colors.card }]}>
                        {/* Header */}
                        <View style={styles.paymentHeader}>
                            <Text style={[styles.paymentTitle, { color: colors.textPrimary }]}>Payment</Text>
                            <TouchableOpacity onPress={closePaymentModal}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Amount Display */}
                            <View style={[styles.amountCard, { backgroundColor: colors.brand }]}>
                                <Text style={styles.amountLabel}>Total Amount</Text>
                                <Text style={styles.amountValue}>₹{taxInfo.total}</Text>
                                <Text style={styles.amountCustomer}>
                                    {customer?.name || 'Walk-in Customer'}
                                </Text>
                            </View>

                            {/* Tax Info Display */}
                            {taxInfo.taxPercent > 0 && (
                                <View style={[styles.summaryCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border, marginTop: 10, padding: 10 }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <Text style={{ color: colors.textSecondary }}>Subtotal</Text>
                                        <Text style={{ color: colors.textPrimary }}>₹{taxInfo.subtotal}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: colors.textSecondary }}>Tax ({taxInfo.taxPercent}%)</Text>
                                        <Text style={{ color: colors.textPrimary }}>₹{taxInfo.taxAmount}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Booking Summary */}
                            <View style={[styles.summaryCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                                <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>Booking Summary</Text>
                                {Object.values(selectedGames).map((item, index) => (
                                    <View key={index} style={styles.summaryItem}>
                                        <Text style={[styles.summaryItemName, { color: colors.textPrimary }]}>
                                            {item.game.name} × {item.coinCount}
                                        </Text>
                                        <Text style={[styles.summaryItemPrice, { color: colors.textPrimary }]}>
                                            ₹{item.game.rate * item.coinCount}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Payment Methods */}
                            <Text style={[styles.paymentMethodsTitle, { color: colors.textSecondary }]}>
                                Select Payment Method
                            </Text>

                            {/* QR Code Option */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentOption,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: selectedPaymentMethod === 'qr' ? colors.brand : colors.border,
                                        borderWidth: selectedPaymentMethod === 'qr' ? 2 : 1,
                                    }
                                ]}
                                onPress={() => handlePayment('qr')}
                            >
                                <View style={[styles.paymentIconWrap, { backgroundColor: '#8B5CF6' }]}>
                                    <Icon name="qrcode-scan" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.paymentOptionInfo}>
                                    <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary }]}>
                                        UPI / QR Code
                                    </Text>
                                    <Text style={[styles.paymentOptionDesc, { color: colors.textMuted }]}>
                                        Pay using any UPI app
                                    </Text>
                                </View>
                                {selectedPaymentMethod === 'qr' && (
                                    <Icon name="check-circle" size={24} color={colors.brand} />
                                )}
                            </TouchableOpacity>

                            {/* QR Code Display (when selected) */}
                            {selectedPaymentMethod === 'qr' && (
                                <View style={[styles.qrCodeCard, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                                    <QRCode
                                        value={getUPIString(taxInfo.total)}
                                        size={180}
                                        backgroundColor="#FFFFFF"
                                        color="#000000"
                                    />
                                    <Text style={styles.qrHint}>
                                        Scan to Pay ₹{taxInfo.total}
                                    </Text>
                                    <Text style={styles.qrNote}>
                                        UPI: {UPI_ID}
                                    </Text>
                                </View>
                            )}

                            {/* Cash Option */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentOption,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: selectedPaymentMethod === 'cash' ? colors.brand : colors.border,
                                        borderWidth: selectedPaymentMethod === 'cash' ? 2 : 1,
                                    }
                                ]}
                                onPress={() => handlePayment('cash')}
                            >
                                <View style={[styles.paymentIconWrap, { backgroundColor: '#10B981' }]}>
                                    <Icon name="cash" size={24} color="#FFFFFF" />
                                </View>
                                <View style={styles.paymentOptionInfo}>
                                    <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary }]}>
                                        Cash Payment
                                    </Text>
                                    <Text style={[styles.paymentOptionDesc, { color: colors.textMuted }]}>
                                        Accept cash from customer
                                    </Text>
                                </View>
                                {selectedPaymentMethod === 'cash' && (
                                    <Icon name="check-circle" size={24} color={colors.brand} />
                                )}
                            </TouchableOpacity>

                            {/* Confirm Button */}
                            <TouchableOpacity
                                style={[
                                    styles.confirmPaymentBtn,
                                    { backgroundColor: selectedPaymentMethod ? colors.brand : colors.border }
                                ]}
                                onPress={completePayment}
                                disabled={!selectedPaymentMethod}
                            >
                                <Icon name="check" size={22} color="#FFFFFF" />
                                <Text style={styles.confirmPaymentText}>
                                    {selectedPaymentMethod === 'cash' ? 'Cash Received' : 'Confirm Payment'}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* History Modal */}
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
                            {customer?.name} • {customer?.mobile}
                        </Text>

                        {customerBookings.length === 0 ? (
                            <View style={styles.emptyHistory}>
                                <Icon name="history" size={64} color={colors.border} />
                                <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                                    No booking history yet
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
                                                <Icon name="gamepad-variant" size={14} color="#FFFFFF" />
                                                <Text style={styles.historyServiceText}>{item.service}</Text>
                                            </View>
                                            <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                                                {formatDateTime(item.timestamp)}
                                            </Text>
                                        </View>

                                        <View style={styles.historyItems}>
                                            {item.items.map((gameItem, idx) => (
                                                <Text key={idx} style={[styles.historyItemText, { color: colors.textPrimary }]}>
                                                    • {gameItem.gameName} × {gameItem.coinCount} = ₹{gameItem.subtotal}
                                                </Text>
                                            ))}
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
        paddingBottom: 100,
    },
    lottieAnimation: {
        width: 200,
        height: 200,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 8,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    viewToggleBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    listContent: {
        paddingHorizontal: 8,
        paddingBottom: 120,
    },
    columnWrapper: {
        justifyContent: 'flex-start',
    },
    headerContent: {
        paddingHorizontal: 8,
        paddingTop: 12,
    },
    customerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    customerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    customerDetails: {
        marginLeft: 12,
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    customerMobile: {
        fontSize: 13,
        marginTop: 2,
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 10,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    modeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 12,
    },
    modeBannerText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
    // Grid styles
    gameCardWrapper: {
        width: isTablet ? '25%' : '50%',
        padding: 6,
    },
    gameCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        minHeight: 160,
        position: 'relative',
    },
    modeIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameCardName: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 4,
    },
    gameCardDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    detailChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
        paddingHorizontal: 6,
        borderRadius: 10,
    },
    detailText: {
        fontSize: 10,
        marginLeft: 3,
    },
    priceText: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    coinControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    coinBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinCountBox: {
        minWidth: 34,
        height: 30,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coinCountText: {
        fontSize: 14,
        fontWeight: '700',
    },
    tapHint: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
    },
    // List styles
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginHorizontal: 6,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderLeftWidth: 4,
    },
    listItemInfo: {
        flex: 1,
    },
    listItemName: {
        fontSize: 15,
        fontWeight: '600',
    },
    listItemDetails: {
        marginTop: 4,
    },
    listItemDetail: {
        fontSize: 12,
    },
    listItemPrice: {
        fontSize: 18,
        fontWeight: '700',
        marginRight: 16,
    },
    listCoinControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    listCoinBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listCoinCount: {
        minWidth: 30,
        height: 28,
        paddingHorizontal: 6,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listCoinText: {
        fontSize: 14,
        fontWeight: '700',
    },
    actionIndicator: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        paddingBottom: 32,
        borderTopWidth: 1,
        elevation: 8,
    },
    totalInfo: {},
    totalLabel: {
        fontSize: 13,
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    totalText: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 22,
        fontWeight: '700',
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    confirmBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 6,
    },
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
        maxHeight: '80%',
        borderRadius: 16,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 20,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    // Payment Modal Styles
    paymentModalContent: {
        width: '100%',
        maxWidth: 420,
        maxHeight: '90%',
        borderRadius: 20,
        padding: 20,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    paymentTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    amountCard: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    amountLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    amountValue: {
        fontSize: 42,
        fontWeight: '800',
        color: '#FFFFFF',
        marginVertical: 4,
    },
    amountCustomer: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    summaryCard: {
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
    },
    summaryTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    summaryItemName: {
        fontSize: 14,
        flex: 1,
    },
    summaryItemPrice: {
        fontSize: 14,
        fontWeight: '600',
    },
    paymentMethodsTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    paymentIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentOptionInfo: {
        flex: 1,
        marginLeft: 14,
    },
    paymentOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    paymentOptionDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    qrCodeCard: {
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
    },
    qrPlaceholder: {
        padding: 20,
    },
    qrHint: {
        fontSize: 14,
        color: '#666666',
        marginTop: 8,
    },
    qrNote: {
        fontSize: 12,
        color: '#999999',
        marginTop: 4,
        fontStyle: 'italic',
    },
    confirmPaymentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 20,
    },
    confirmPaymentText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    // History Button Styles
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
        marginBottom: 16,
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

export default GamesScreen;
