import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    Modal,
    ScrollView,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { SlideUp, FadeIn } from '../utils/animations';
import { getTheaterShows, saveTheaterBooking, getUPIString, UPI_ID, addTheaterShow, updateTheaterShow, deleteTheaterShow } from '../utils/api';
import QRCode from 'react-native-qrcode-svg';

// Safe Dimensions access with fallback
let isTablet = false;
try {
    isTablet = Dimensions.get('window').width >= 768;
} catch (error) {
    console.warn('Dimensions not available during TheaterBookingScreen initialization');
}

// Seat Categories
const SEAT_CATEGORIES = [
    { id: 'regular', name: 'Regular', multiplier: 1, color: '#6B7280' },
    { id: 'premium', name: 'Premium', multiplier: 1.5, color: '#3B82F6' },
    { id: 'vip', name: 'VIP', multiplier: 2, color: '#F59E0B' },
];

const TheaterBookingScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const customer = route?.params?.customer;

    const [shows, setShows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedShow, setSelectedShow] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [seatCategory, setSeatCategory] = useState(SEAT_CATEGORIES[0]);
    const [ticketCount, setTicketCount] = useState('2');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    // Management State
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [showShowManageModal, setShowShowManageModal] = useState(false);
    const [editingShow, setEditingShow] = useState(null);
    const [manageLoading, setManageLoading] = useState(false);

    // Show Form State
    const [showName, setShowName] = useState('');
    const [showPrice, setShowPrice] = useState('');
    const [showTime, setShowTime] = useState('');
    const [showDuration, setShowDuration] = useState('');
    const [showTotalSeats, setShowTotalSeats] = useState('');
    const [showIcon, setShowIcon] = useState('movie');

    const fetchShows = useCallback(async () => {
        try {
            const data = await getTheaterShows();
            setShows(data || []);
        } catch (error) {
            console.error('Error fetching shows:', error);
            Alert.alert('Error', 'Failed to load shows. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchShows();
    }, [fetchShows]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchShows();
    };

    const handleSelectShow = (show) => {
        if (isEditMode) {
            openEditShow(show);
            return;
        }
        if (isDeleteMode) {
            handleDeleteShow(show);
            return;
        }

        if (show.availableSeats === 0) return;
        setSelectedShow(show);
        setShowBookingModal(true);
    };

    // Management Functions
    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
        setIsDeleteMode(false);
    };

    const toggleDeleteMode = () => {
        setIsDeleteMode(!isDeleteMode);
        setIsEditMode(false);
    };

    const openAddShow = () => {
        setEditingShow(null);
        setShowName('');
        setShowPrice('');
        setShowTime('');
        setShowDuration('45 min');
        setShowTotalSeats('50');
        setShowIcon('movie');
        setShowShowManageModal(true);
    };

    const openEditShow = (show) => {
        setEditingShow(show);
        setShowName(show.name);
        setShowPrice(String(show.price));
        setShowTime(show.time);
        setShowDuration(show.duration);
        setShowTotalSeats(String(show.totalSeats));
        setShowIcon(show.icon || 'movie');
        setShowShowManageModal(true);
    };

    const handleSaveShow = async () => {
        if (!showName || !showPrice || !showTime) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setManageLoading(true);
        try {
            const showData = {
                name: showName,
                price: parseFloat(showPrice),
                time: showTime,
                duration: showDuration,
                totalSeats: parseInt(showTotalSeats),
                availableSeats: editingShow ?
                    (editingShow.availableSeats + (parseInt(showTotalSeats) - editingShow.totalSeats)) :
                    parseInt(showTotalSeats),
                icon: showIcon,
            };

            if (editingShow) {
                await updateTheaterShow(editingShow.showId, showData);
            } else {
                await addTheaterShow(showData);
            }

            Alert.alert('Success', `Show ${editingShow ? 'updated' : 'added'} successfully!`);
            setShowShowManageModal(false);
            fetchShows();
        } catch (error) {
            console.error('Error saving show:', error);
            Alert.alert('Error', 'Failed to save show package');
        } finally {
            setManageLoading(false);
        }
    };

    const handleDeleteShow = (show) => {
        Alert.alert(
            'Delete Show',
            `Are you sure you want to delete ${show.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTheaterShow(show.showId);
                            fetchShows();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete show');
                        }
                    }
                }
            ]
        );
    };

    const calculateTotal = () => {
        if (!selectedShow) return 0;
        const count = parseInt(ticketCount) || 1;
        return Math.round(selectedShow.price * seatCategory.multiplier * count);
    };

    const handleConfirmBooking = async () => {
        if (!selectedShow || !customer) {
            Alert.alert('Error', 'Missing show or customer information');
            return;
        }

        const count = parseInt(ticketCount);
        if (isNaN(count) || count <= 0) {
            Alert.alert('Error', 'Please enter a valid ticket count');
            return;
        }

        if (count > selectedShow.availableSeats) {
            Alert.alert('Error', 'Not enough seats available');
            return;
        }

        setBookingLoading(true);
        try {
            const bookingData = {
                customerId: customer.customerId,
                customerName: customer.name,
                customerMobile: customer.mobile,
                showId: selectedShow.showId,
                showName: selectedShow.name,
                showTime: selectedShow.time,
                seatCategory: seatCategory.name,
                ticketCount: count,
                totalAmount: calculateTotal(),
                service: 'Theater',
                paymentMethod: paymentMethod,
            };

            await saveTheaterBooking(bookingData);

            Alert.alert(
                'Success',
                'Theater tickets booked successfully!',
                [{
                    text: 'OK', onPress: () => {
                        setShowBookingModal(false);
                        fetchShows(); // Refresh availability
                    }
                }]
            );
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert('Error', error.message || 'Failed to complete booking');
        } finally {
            setBookingLoading(false);
        }
    };

    const renderShowCard = ({ item }) => (
        <SlideUp style={styles.cardWrapper}>
            <TouchableOpacity
                style={[
                    styles.showCard,
                    { backgroundColor: colors.card, borderColor: item.availableSeats > 0 ? colors.border : '#EF4444' },
                    item.availableSeats === 0 && styles.soldOutCard,
                ]}
                onPress={() => handleSelectShow(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.showIconContainer, { backgroundColor: item.availableSeats > 0 ? '#8B5CF6' : '#EF4444' }]}>
                    <Icon name={item.icon || 'movie'} size={32} color="#FFFFFF" />
                </View>
                <View style={styles.showInfo}>
                    <Text style={[styles.showName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <View style={styles.showMeta}>
                        <Icon name="clock-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.time}</Text>
                        <Text style={[styles.metaSeparator, { color: colors.textMuted }]}>•</Text>
                        <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.duration}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceValue, { color: colors.brand }]}>₹{item.price}</Text>
                        <Text style={[styles.priceLabel, { color: colors.textSecondary }]}> / person</Text>
                    </View>
                </View>

                {isEditMode || isDeleteMode ? (
                    <View style={[styles.actionIndicator, { backgroundColor: isEditMode ? colors.brand : colors.error }]}>
                        <Icon name={isEditMode ? 'pencil' : 'delete'} size={18} color="#FFFFFF" />
                    </View>
                ) : item.availableSeats > 0 ? (
                    <View style={styles.showCardRight}>
                        <View style={styles.seatsInfo}>
                            <Text style={[styles.seatsCount, { color: colors.brand }]}>{item.availableSeats}</Text>
                            <Text style={[styles.seatsLabel, { color: colors.textMuted }]}>seats</Text>
                        </View>
                        <View style={[styles.bookBtn, { backgroundColor: colors.brand }]}>
                            <Text style={styles.bookBtnText}>ADD</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.soldOutBadge}>
                        <Text style={styles.soldOutText}>Sold Out</Text>
                    </View>
                )}
            </TouchableOpacity>
        </SlideUp>
    );

    const renderBookingModal = () => (
        <Modal
            visible={showBookingModal}
            transparent
            animationType="slide"
            onRequestClose={() => !bookingLoading && setShowBookingModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Book Tickets</Text>
                            <TouchableOpacity onPress={() => !bookingLoading && setShowBookingModal(false)}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {selectedShow && (
                            <View style={[styles.selectedShowCard, { backgroundColor: colors.background }]}>
                                <View style={[styles.showBadge, { backgroundColor: '#8B5CF6' }]}>
                                    <Icon name={selectedShow.icon || 'movie'} size={24} color="#FFFFFF" />
                                </View>
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.selectedShowName, { color: colors.textPrimary }]}>{selectedShow.name}</Text>
                                    <Text style={[styles.selectedShowTime, { color: colors.textSecondary }]}>{selectedShow.time} • {selectedShow.duration}</Text>
                                </View>
                            </View>
                        )}

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Seat Category</Text>
                        <View style={styles.categoryRow}>
                            {SEAT_CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    disabled={bookingLoading}
                                    style={[
                                        styles.categoryBtn,
                                        { borderColor: seatCategory.id === cat.id ? cat.color : colors.border },
                                        seatCategory.id === cat.id && { backgroundColor: cat.color },
                                    ]}
                                    onPress={() => setSeatCategory(cat)}
                                >
                                    <Text style={[styles.categoryText, { color: seatCategory.id === cat.id ? '#FFFFFF' : colors.textPrimary }]}>{cat.name}</Text>
                                    <Text style={[styles.categoryMultiplier, { color: seatCategory.id === cat.id ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>x{cat.multiplier}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Number of Tickets</Text>
                        <View style={styles.ticketSelector}>
                            <TouchableOpacity
                                disabled={bookingLoading}
                                style={[styles.ticketBtn, { backgroundColor: colors.background }]}
                                onPress={() => setTicketCount(String(Math.max(1, (parseInt(ticketCount) || 1) - 1)))}
                            >
                                <Icon name="minus" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.ticketCount, { color: colors.textPrimary }]}
                                value={ticketCount}
                                onChangeText={setTicketCount}
                                keyboardType="number-pad"
                                editable={!bookingLoading}
                            />
                            <TouchableOpacity
                                disabled={bookingLoading}
                                style={[styles.ticketBtn, { backgroundColor: colors.background }]}
                                onPress={() => setTicketCount(String((parseInt(ticketCount) || 1) + 1))}
                            >
                                <Icon name="plus" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Payment Method</Text>
                        <View style={styles.paymentRow}>
                            {['Cash', 'QR Code'].map((method) => (
                                <TouchableOpacity
                                    key={method}
                                    style={[
                                        styles.paymentBtn,
                                        { borderColor: paymentMethod === method ? colors.brand : colors.border },
                                        paymentMethod === method && { backgroundColor: colors.brand + '15' }
                                    ]}
                                    onPress={() => setPaymentMethod(method)}
                                >
                                    <Icon
                                        name={method === 'Cash' ? 'cash' : 'qrcode-scan'}
                                        size={20}
                                        color={paymentMethod === method ? colors.brand : colors.textMuted}
                                    />
                                    <Text style={[styles.paymentText, { color: paymentMethod === method ? colors.brand : colors.textPrimary }]}>{method}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {paymentMethod === 'QR Code' && (
                            <View style={[styles.qrCodeCardInModal, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
                                <QRCode
                                    value={getUPIString(calculateTotal())}
                                    size={160}
                                    backgroundColor="#FFFFFF"
                                    color="#000000"
                                />
                                <Text style={styles.qrHintInModal}>Scan to Pay ₹{calculateTotal()}</Text>
                                <Text style={styles.qrNoteInModal}>UPI: {UPI_ID}</Text>
                            </View>
                        )}

                        <View style={[styles.totalContainer, { borderTopColor: colors.border }]}>
                            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Amount</Text>
                            <Text style={[styles.totalValue, { color: colors.brand }]}>₹{calculateTotal()}</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            disabled={bookingLoading}
                            style={[styles.cancelBtn, { borderColor: colors.border }]}
                            onPress={() => setShowBookingModal(false)}
                        >
                            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, bookingLoading && { opacity: 0.7 }]}
                            onPress={handleConfirmBooking}
                            disabled={bookingLoading}
                        >
                            {bookingLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Icon name="ticket-confirmation" size={18} color="#FFFFFF" />
                                    <Text style={styles.confirmBtnText}>Book Tickets</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderShowManageModal = () => (
        <Modal
            visible={showShowManageModal}
            transparent
            animationType="slide"
            onRequestClose={() => !manageLoading && setShowShowManageModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                            {editingShow ? 'Edit Show Package' : 'Add New Show'}
                        </Text>
                        <TouchableOpacity onPress={() => !manageLoading && setShowShowManageModal(false)}>
                            <Icon name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Show Name *</Text>
                        <TextInput
                            style={[styles.manageInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="e.g. Magic Show"
                            placeholderTextColor={colors.textMuted}
                            value={showName}
                            onChangeText={setShowName}
                        />

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Price (₹) *</Text>
                        <TextInput
                            style={[styles.manageInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="e.g. 500"
                            placeholderTextColor={colors.textMuted}
                            value={showPrice}
                            onChangeText={setShowPrice}
                            keyboardType="number-pad"
                        />

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Show Time *</Text>
                        <TextInput
                            style={[styles.manageInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="e.g. 11:00 AM"
                            placeholderTextColor={colors.textMuted}
                            value={showTime}
                            onChangeText={setShowTime}
                        />

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Duration</Text>
                        <TextInput
                            style={[styles.manageInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="e.g. 45 min"
                            placeholderTextColor={colors.textMuted}
                            value={showDuration}
                            onChangeText={setShowDuration}
                        />

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Total Seats</Text>
                        <TextInput
                            style={[styles.manageInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="e.g. 50"
                            placeholderTextColor={colors.textMuted}
                            value={showTotalSeats}
                            onChangeText={setShowTotalSeats}
                            keyboardType="number-pad"
                        />

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Icon Name</Text>
                        <TextInput
                            style={[styles.manageInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="e.g. movie, magic-staff"
                            placeholderTextColor={colors.textMuted}
                            value={showIcon}
                            onChangeText={setShowIcon}
                        />
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            disabled={manageLoading}
                            style={[styles.cancelBtn, { borderColor: colors.border }]}
                            onPress={() => setShowShowManageModal(false)}
                        >
                            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, manageLoading && { opacity: 0.7 }]}
                            onPress={handleSaveShow}
                            disabled={manageLoading}
                        >
                            {manageLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Icon name="check" size={18} color="#FFFFFF" />
                                    <Text style={styles.confirmBtnText}>Save Show</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Theater & Shows" subtitle={customer?.name || 'Guest'} />

            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
            </TouchableOpacity>

            <View style={styles.headerActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isEditMode ? colors.brand : colors.card, borderColor: colors.brand, borderWidth: 1 }]}
                    onPress={toggleEditMode}
                >
                    <Icon name="pencil" size={20} color={isEditMode ? '#FFFFFF' : colors.brand} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDeleteMode ? '#EF4444' : colors.card, borderColor: '#EF4444', borderWidth: 1 }]}
                    onPress={toggleDeleteMode}
                >
                    <Icon name="delete" size={20} color={isDeleteMode ? '#FFFFFF' : '#EF4444'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                    onPress={openAddShow}
                >
                    <Icon name="plus" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.brand} />
                </View>
            ) : (
                <FlatList
                    data={shows}
                    keyExtractor={(item) => item.showId}
                    renderItem={renderShowCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
                    }
                    ListHeaderComponent={
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Today's Shows</Text>
                    }
                    ListEmptyComponent={
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <Icon name="movie-off-outline" size={64} color={colors.textMuted} />
                            <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 16 }}>No shows available today</Text>
                        </View>
                    }
                />
            )}

            {renderBookingModal()}
            {renderShowManageModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    backBtn: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    backText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
    cardWrapper: { marginBottom: 12 },
    showCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    soldOutCard: { opacity: 0.6 },
    showIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    showInfo: { flex: 1 },
    showName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    showMeta: { flexDirection: 'row', alignItems: 'center' },
    metaText: { fontSize: 12, marginLeft: 4 },
    metaSeparator: { marginHorizontal: 6 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
    priceValue: { fontSize: 16, fontWeight: '800' },
    priceLabel: { fontSize: 12 },
    showCardRight: { alignItems: 'center', gap: 8 },
    seatsInfo: { alignItems: 'center' },
    seatsCount: { fontSize: 18, fontWeight: '800' },
    seatsLabel: { fontSize: 9, textTransform: 'uppercase' },
    bookBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 54,
        alignItems: 'center',
    },
    bookBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    soldOutBadge: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    soldOutText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    selectedShowCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 20 },
    showBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    selectedShowName: { fontSize: 16, fontWeight: '700' },
    selectedShowTime: { fontSize: 13, marginTop: 2 },
    sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 12 },
    categoryRow: { flexDirection: 'row', gap: 10 },
    categoryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
    categoryText: { fontSize: 14, fontWeight: '700' },
    categoryMultiplier: { fontSize: 11, marginTop: 2 },
    ticketSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 10 },
    ticketBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    ticketCount: { fontSize: 28, fontWeight: '800', minWidth: 50, textAlign: 'center' },
    totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginTop: 20, borderTopWidth: 1 },
    totalLabel: { fontSize: 16, fontWeight: '600' },
    totalValue: { fontSize: 24, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    cancelBtnText: { fontSize: 15, fontWeight: '600' },
    confirmBtn: { flex: 1.5, flexDirection: 'row', backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
    confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    paymentRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
    paymentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    paymentText: { fontSize: 14, fontWeight: '600' },
    qrCodeCardInModal: {
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
        borderWidth: 1,
    },
    qrHintInModal: {
        fontSize: 14,
        color: '#666666',
        marginTop: 8,
    },
    qrNoteInModal: {
        fontSize: 12,
        color: '#999999',
        marginTop: 4,
        fontStyle: 'italic',
    },
    headerActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
        alignItems: 'center',
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    actionIndicator: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    manageInput: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 15,
        marginBottom: 16,
    },
});

export default TheaterBookingScreen;
