import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { SlideUp, FadeIn } from '../utils/animations';
import {
    getFunctionHalls,
    addFunctionHall,
    updateFunctionHall,
    deleteFunctionHall,
    saveFunctionHallBooking,
    getTaxByService,
    getUPIString
} from '../utils/api';
import QRCode from 'react-native-qrcode-svg';

// Safe Dimensions access with fallback
let isTablet = false;
try {
    isTablet = Dimensions.get('window').width >= 768;
} catch (error) {
    console.warn('Dimensions not available during FunctionHallScreen initialization');
}

// Sample Function Halls (Frontend Only)
const FUNCTION_HALLS = [
    { id: 'hall_1', name: 'Grand Ballroom', capacity: 500, pricePerHour: 5000, pricePerDay: 35000, amenities: ['AC', 'Stage', 'Sound System', 'Parking'], available: true, icon: 'castle' },
    { id: 'hall_2', name: 'Crystal Hall', capacity: 200, pricePerHour: 3000, pricePerDay: 20000, amenities: ['AC', 'Projector', 'WiFi'], available: true, icon: 'diamond-stone' },
    { id: 'hall_3', name: 'Garden Pavilion', capacity: 150, pricePerHour: 2000, pricePerDay: 15000, amenities: ['Open Air', 'Lawn', 'Stage'], available: false, icon: 'flower' },
    { id: 'hall_4', name: 'Conference Room A', capacity: 50, pricePerHour: 1000, pricePerDay: 7000, amenities: ['AC', 'Projector', 'WiFi', 'Whiteboard'], available: true, icon: 'presentation' },
    { id: 'hall_5', name: 'Banquet Hall', capacity: 300, pricePerHour: 4000, pricePerDay: 28000, amenities: ['AC', 'Stage', 'Catering', 'Decor'], available: true, icon: 'silverware-fork-knife' },
];

// Event Types
const EVENT_TYPES = [
    { id: 'wedding', name: 'Wedding', icon: 'heart' },
    { id: 'conference', name: 'Conference', icon: 'account-group' },
    { id: 'birthday', name: 'Birthday Party', icon: 'cake-variant' },
    { id: 'corporate', name: 'Corporate Event', icon: 'briefcase' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
];

const FunctionHallScreen = ({ navigation, route }) => {
    const { colors, isDark } = useTheme();
    const customer = route?.params?.customer;

    const [halls, setHalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHall, setSelectedHall] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingType, setBookingType] = useState('hourly');
    const [duration, setDuration] = useState('4');
    const [eventType, setEventType] = useState(EVENT_TYPES[0]);
    const [guestCount, setGuestCount] = useState('100');
    const [eventName, setEventName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [showQRCode, setShowQRCode] = useState(false);
    const [taxPercent, setTaxPercent] = useState(18);

    // Management State
    const [isManageMode, setIsManageMode] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [editingHall, setEditingHall] = useState(null);
    const [hallForm, setHallForm] = useState({
        name: '',
        capacity: '',
        pricePerHour: '',
        pricePerDay: '',
        amenities: '',
        available: true,
        icon: 'castle'
    });

    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [hallsData, taxRate] = await Promise.all([
                getFunctionHalls(),
                getTaxByService('rooms') // Using rooms tax for now or update backend for 'hall'
            ]);
            setHalls(hallsData);
            setTaxPercent(taxRate || 18);
        } catch (error) {
            console.error('Error loading function halls:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectHall = (hall) => {
        if (!hall.available && !isManageMode) return;

        if (isManageMode) {
            handleEditHall(hall);
            return;
        }

        setSelectedHall(hall);
        setDuration('4');
        setBookingType('hourly');
        setEventName('');
        setGuestCount(hall.capacity?.toString() || '100');
        setShowBookingModal(true);
    };

    const handleEditHall = (hall) => {
        setEditingHall(hall);
        setHallForm({
            name: hall.name || '',
            capacity: hall.capacity ? hall.capacity.toString() : '',
            pricePerHour: hall.pricePerHour ? hall.pricePerHour.toString() : '',
            pricePerDay: hall.pricePerDay ? hall.pricePerDay.toString() : '',
            amenities: Array.isArray(hall.amenities) ? hall.amenities.join(', ') : (hall.amenities || ''),
            available: !!hall.available,
            icon: hall.icon || 'castle'
        });
        setShowManageModal(true);
    };

    const handleAddHall = () => {
        setEditingHall(null);
        setHallForm({
            name: '',
            capacity: '',
            pricePerHour: '',
            pricePerDay: '',
            amenities: '',
            available: true,
            icon: 'castle'
        });
        setShowManageModal(true);
    };

    const saveHall = async () => {
        try {
            const payload = {
                ...hallForm,
                capacity: parseInt(hallForm.capacity) || 0,
                pricePerHour: parseInt(hallForm.pricePerHour) || 0,
                pricePerDay: parseInt(hallForm.pricePerDay) || 0,
                amenities: typeof hallForm.amenities === 'string' ? hallForm.amenities.split(',').map(s => s.trim()).filter(s => s) : []
            };

            if (editingHall) {
                await updateFunctionHall(editingHall.id, payload);
            } else {
                await addFunctionHall(payload);
            }
            setShowManageModal(false);
            loadData();
        } catch (error) {
            alert('Error saving hall: ' + error.message);
        }
    };

    const handleDeleteHall = async (id) => {
        if (confirm('Are you sure you want to delete this hall?')) {
            try {
                await deleteFunctionHall(id);
                loadData();
            } catch (error) {
                alert('Error deleting hall');
            }
        }
    };

    const handleBooking = async () => {
        if (paymentMethod === 'QR Code' && !showQRCode) {
            setShowQRCode(true);
            return;
        }

        try {
            const subtotal = calculateTotal();
            const taxAmount = Math.round((subtotal * taxPercent) / 100);
            const total = subtotal + taxAmount;

            const booking = {
                customerId: customer?.customerId || 'walk-in',
                customerName: customer?.name || 'Walk-in Customer',
                hallId: selectedHall.id,
                hallName: selectedHall.name,
                eventName: eventName || `${eventType.name} Event`,
                eventType: eventType.name,
                bookingType,
                duration: parseInt(duration),
                guestCount: parseInt(guestCount),
                subtotal,
                taxPercent,
                taxAmount,
                totalAmount: total,
                paymentMethod,
                timestamp: new Date().toISOString()
            };

            await saveFunctionHallBooking(booking);
            setShowBookingModal(false);
            setShowQRCode(false);
            alert('Booking Successful!');
            navigation.goBack();
        } catch (error) {
            alert('Booking failed: ' + error.message);
        }
    };

    const calculateTotal = () => {
        if (!selectedHall) return 0;
        const durationNum = parseInt(duration) || 1;
        const price = bookingType === 'hourly' ? selectedHall.pricePerHour : selectedHall.pricePerDay;
        return price * durationNum;
    };

    const renderHallCard = ({ item }) => (
        <SlideUp style={styles.cardWrapper}>
            <TouchableOpacity
                style={[
                    styles.hallCard,
                    { backgroundColor: colors.card, borderColor: item.available ? colors.border : '#EF4444' },
                    !item.available && styles.unavailableCard,
                ]}
                onPress={() => handleSelectHall(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.hallIconContainer, { backgroundColor: item.available ? '#EC4899' : '#EF4444' }]}>
                    <Icon name={item.icon} size={32} color="#FFFFFF" />
                </View>
                <View style={styles.hallInfo}>
                    <Text style={[styles.hallName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <View style={styles.hallMeta}>
                        <Icon name="account-group" size={14} color={colors.textMuted} />
                        <Text style={[styles.capacityText, { color: colors.textMuted }]}>Up to {item.capacity} guests</Text>
                    </View>
                    <View style={styles.amenitiesRow}>
                        {item.amenities.map((amenity, idx) => (
                            <View key={idx} style={[styles.amenityBadge, { backgroundColor: colors.background }]}>
                                <Text style={[styles.amenityText, { color: colors.textSecondary }]}>{amenity}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceValue, { color: colors.brand }]}>₹{item.pricePerHour}</Text>
                        <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>/hr</Text>
                    </View>
                </View>
                {isManageMode ? (
                    <View style={styles.manageActions}>
                        <TouchableOpacity style={styles.editIcon} onPress={() => handleEditHall(item)}>
                            <Icon name="pencil" size={20} color={colors.brand} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteIcon} onPress={() => handleDeleteHall(item.id)}>
                            <Icon name="delete" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    item.available ? (
                        <Icon name="chevron-right" size={24} color={colors.textMuted} />
                    ) : (
                        <View style={styles.bookedBadge}>
                            <Text style={styles.bookedText}>Booked</Text>
                        </View>
                    )
                )}
            </TouchableOpacity>
        </SlideUp>
    );

    const renderBookingModal = () => (
        <Modal
            visible={showBookingModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowBookingModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Book Function Hall</Text>
                            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {selectedHall && (
                            <View style={[styles.selectedHallCard, { backgroundColor: colors.background }]}>
                                <View style={[styles.hallBadge, { backgroundColor: '#EC4899' }]}>
                                    <Icon name={selectedHall.icon} size={24} color="#FFFFFF" />
                                </View>
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.selectedHallName, { color: colors.textPrimary }]}>{selectedHall.name}</Text>
                                    <Text style={[styles.selectedHallCapacity, { color: colors.textSecondary }]}>Capacity: {selectedHall.capacity} guests</Text>
                                </View>
                            </View>
                        )}

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Event Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventTypeScroll}>
                            {EVENT_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.eventTypeBtn,
                                        { backgroundColor: eventType.id === type.id ? '#EC4899' : colors.background, borderColor: eventType.id === type.id ? '#EC4899' : colors.border },
                                    ]}
                                    onPress={() => setEventType(type)}
                                >
                                    <Icon name={type.icon} size={18} color={eventType.id === type.id ? '#FFFFFF' : colors.textPrimary} />
                                    <Text style={[styles.eventTypeText, { color: eventType.id === type.id ? '#FFFFFF' : colors.textPrimary }]}>{type.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Event Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            value={eventName}
                            onChangeText={setEventName}
                            placeholder="e.g., Ram's Birthday Party"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Booking Type</Text>
                        <View style={styles.toggleRow}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, bookingType === 'hourly' && { backgroundColor: colors.brand }]}
                                onPress={() => setBookingType('hourly')}
                            >
                                <Text style={[styles.toggleText, bookingType === 'hourly' && { color: '#FFFFFF' }]}>Hourly</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, bookingType === 'daily' && { backgroundColor: colors.brand }]}
                                onPress={() => setBookingType('daily')}
                            >
                                <Text style={[styles.toggleText, bookingType === 'daily' && { color: '#FFFFFF' }]}>Full Day</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rowInputs}>
                            <View style={styles.halfInput}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Duration ({bookingType === 'hourly' ? 'Hours' : 'Days'})</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                    value={duration}
                                    onChangeText={setDuration}
                                    keyboardType="numeric"
                                    placeholder="4"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Expected Guests</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                    value={guestCount}
                                    onChangeText={setGuestCount}
                                    keyboardType="numeric"
                                    placeholder="100"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>

                        <View style={[styles.totalContainer, { borderTopColor: colors.border }]}>
                            <View>
                                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal: ₹{calculateTotal()}</Text>
                                <Text style={[styles.taxLabel, { color: colors.textMuted }]}>Tax ({taxPercent}%): ₹{Math.round((calculateTotal() * taxPercent) / 100)}</Text>
                            </View>
                            <Text style={[styles.totalValue, { color: colors.brand }]}>₹{Math.round(calculateTotal() * (1 + taxPercent / 100))}</Text>
                        </View>

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Payment Method</Text>
                        <View style={styles.paymentRow}>
                            {['Cash', 'QR Code'].map((method) => (
                                <TouchableOpacity
                                    key={method}
                                    style={[
                                        styles.paymentBtn,
                                        { backgroundColor: paymentMethod === method ? colors.brand : colors.background, borderColor: colors.brand },
                                    ]}
                                    onPress={() => setPaymentMethod(method)}
                                >
                                    <Icon
                                        name={method === 'Cash' ? 'cash' : 'qrcode'}
                                        size={20}
                                        color={paymentMethod === method ? '#FFFFFF' : colors.brand}
                                    />
                                    <Text style={[styles.paymentText, { color: paymentMethod === method ? '#FFFFFF' : colors.brand }]}>
                                        {method}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: colors.border }]}
                            onPress={() => setShowBookingModal(false)}
                        >
                            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleBooking}>
                            <Icon name={paymentMethod === 'QR Code' && !showQRCode ? "qrcode" : "calendar-check"} size={18} color="#FFFFFF" />
                            <Text style={styles.confirmBtnText}>
                                {paymentMethod === 'QR Code' && !showQRCode ? 'Generate QR' : 'Confirm Booking'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderManageModal = () => (
        <Modal visible={showManageModal} transparent animationType="slide" onRequestClose={() => setShowManageModal(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                {editingHall ? 'Edit Venue' : 'Add New Venue'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowManageModal(false)}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Venue Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            value={hallForm.name}
                            onChangeText={(text) => setHallForm({ ...hallForm, name: text })}
                            placeholder="e.g. Diamond Hall"
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.inputLabel}>Capacity</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                    value={hallForm.capacity}
                                    onChangeText={(text) => setHallForm({ ...hallForm, capacity: text })}
                                    keyboardType="numeric"
                                    placeholder="200"
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.inputLabel}>Icon Name</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                    value={hallForm.icon}
                                    onChangeText={(text) => setHallForm({ ...hallForm, icon: text })}
                                    placeholder="castle"
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.inputLabel}>Price/Hour (₹)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                    value={hallForm.pricePerHour}
                                    onChangeText={(text) => setHallForm({ ...hallForm, pricePerHour: text })}
                                    keyboardType="numeric"
                                    placeholder="3000"
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.inputLabel}>Price/Day (₹)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                                    value={hallForm.pricePerDay}
                                    onChangeText={(text) => setHallForm({ ...hallForm, pricePerDay: text })}
                                    keyboardType="numeric"
                                    placeholder="25000"
                                />
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>Amenities (comma separated)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            value={hallForm.amenities}
                            onChangeText={(text) => setHallForm({ ...hallForm, amenities: text })}
                            placeholder="AC, WiFi, Stage"
                            multiline
                        />

                        <TouchableOpacity
                            style={styles.switchRow}
                            onPress={() => setHallForm({ ...hallForm, available: !hallForm.available })}
                        >
                            <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Available for Booking</Text>
                            <Icon
                                name={hallForm.available ? "checkbox-marked" : "checkbox-blank-outline"}
                                size={24}
                                color={colors.brand}
                            />
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowManageModal(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.brand }]} onPress={saveHall}>
                            <Text style={styles.confirmBtnText}>Save Venue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderQRCodeModal = () => {
        const total = Math.round(calculateTotal() * (1 + taxPercent / 100));
        return (
            <Modal visible={showQRCode} transparent animationType="fade" onRequestClose={() => setShowQRCode(false)}>
                <View style={styles.qrModalOverlay}>
                    <View style={[styles.qrContainer, { backgroundColor: colors.card }]}>
                        <View style={styles.qrHeader}>
                            <Text style={[styles.qrTitle, { color: colors.textPrimary }]}>Scan to Pay</Text>
                            <TouchableOpacity onPress={() => setShowQRCode(false)}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.qrWrapper}>
                            <QRCode value={getUPIString(total)} size={220} color={colors.textPrimary} backgroundColor={colors.card} />
                        </View>

                        <Text style={[styles.qrAmount, { color: colors.brand }]}>₹{total}</Text>
                        <Text style={[styles.qrSubtitle, { color: colors.textSecondary }]}>Select UPI App to pay</Text>

                        <TouchableOpacity style={[styles.confirmBookingBtn, { backgroundColor: colors.brand }]} onPress={handleBooking}>
                            <Text style={styles.confirmBookingBtnText}>Confirm After Payment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Function Hall" subtitle={customer?.name || 'Guest'} />

            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
            </TouchableOpacity>

            <FlatList
                data={halls}
                keyExtractor={(item) => item.id}
                renderItem={renderHallCard}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={loadData}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                            {isManageMode ? 'Manage Venues' : 'Available Venues'}
                        </Text>
                        <TouchableOpacity
                            style={[styles.manageToggle, { backgroundColor: isManageMode ? colors.brand : colors.background, borderColor: colors.brand }]}
                            onPress={() => setIsManageMode(!isManageMode)}
                        >
                            <Icon name={isManageMode ? "check" : "cog"} size={16} color={isManageMode ? "#FFFFFF" : colors.brand} />
                            <Text style={[styles.manageText, { color: isManageMode ? "#FFFFFF" : colors.brand }]}>
                                {isManageMode ? 'Done' : 'Manage'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {isManageMode && (
                <TouchableOpacity style={[styles.fab, { backgroundColor: colors.brand }]} onPress={handleAddHall}>
                    <Icon name="plus" size={30} color="#FFFFFF" />
                </TouchableOpacity>
            )}

            {renderBookingModal()}
            {renderManageModal()}
            {renderQRCodeModal()}
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
    hallCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    unavailableCard: { opacity: 0.6 },
    hallIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    hallInfo: { flex: 1 },
    hallName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    hallMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    capacityText: { fontSize: 12, marginLeft: 4 },
    amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    amenityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    amenityText: { fontSize: 10, fontWeight: '600' },
    moreAmenities: { fontSize: 11, alignSelf: 'center' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline' },
    priceValue: { fontSize: 16, fontWeight: '800' },
    priceLabel: { fontSize: 12 },
    bookedBadge: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    bookedText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    selectedHallCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
    hallBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    selectedHallName: { fontSize: 16, fontWeight: '700' },
    selectedHallCapacity: { fontSize: 13, marginTop: 2 },
    sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 10 },
    eventTypeScroll: { marginBottom: 10 },
    eventTypeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginRight: 10, borderWidth: 1, gap: 6 },
    eventTypeText: { fontSize: 13, fontWeight: '600' },
    input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
    toggleRow: { flexDirection: 'row', gap: 12 },
    toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
    toggleText: { fontSize: 14, fontWeight: '600', color: '#333' },
    rowInputs: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },
    totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginTop: 16, borderTopWidth: 1 },
    totalLabel: { fontSize: 16, fontWeight: '600' },
    totalValue: { fontSize: 24, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    cancelBtnText: { fontSize: 15, fontWeight: '600' },
    confirmBtn: { flex: 1.5, flexDirection: 'row', backgroundColor: '#EC4899', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
    confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    // New Styles
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    manageToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
    manageText: { fontSize: 13, fontWeight: '700' },
    fab: { position: 'absolute', right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    manageActions: { flexDirection: 'row', gap: 10 },
    editIcon: { padding: 4 },
    deleteIcon: { padding: 4 },
    qrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    qrContainer: { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center' },
    qrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
    qrTitle: { fontSize: 22, fontWeight: '800' },
    qrWrapper: { padding: 20, backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 20 },
    qrAmount: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
    qrSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: 24 },
    confirmBookingBtn: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    confirmBookingBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    taxLabel: { fontSize: 12, marginTop: 2 },
    paymentRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    paymentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
    paymentText: { fontSize: 14, fontWeight: '700' },
    row: { flexDirection: 'row', marginBottom: 8 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 12 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingVertical: 10 },
});

export default FunctionHallScreen;
