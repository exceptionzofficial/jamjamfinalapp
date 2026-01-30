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

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

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
    const { colors } = useTheme();
    const customer = route?.params?.customer;

    const [selectedHall, setSelectedHall] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingType, setBookingType] = useState('hourly');
    const [duration, setDuration] = useState('4');
    const [eventType, setEventType] = useState(EVENT_TYPES[0]);
    const [guestCount, setGuestCount] = useState('100');
    const [eventName, setEventName] = useState('');

    const handleSelectHall = (hall) => {
        if (!hall.available) return;
        setSelectedHall(hall);
        setShowBookingModal(true);
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
                        {item.amenities.slice(0, 3).map((amenity, idx) => (
                            <View key={idx} style={[styles.amenityBadge, { backgroundColor: colors.background }]}>
                                <Text style={[styles.amenityText, { color: colors.textSecondary }]}>{amenity}</Text>
                            </View>
                        ))}
                        {item.amenities.length > 3 && (
                            <Text style={[styles.moreAmenities, { color: colors.textMuted }]}>+{item.amenities.length - 3}</Text>
                        )}
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceValue, { color: colors.brand }]}>₹{item.pricePerHour}</Text>
                        <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>/hr</Text>
                    </View>
                </View>
                {item.available ? (
                    <Icon name="chevron-right" size={24} color={colors.textMuted} />
                ) : (
                    <View style={styles.bookedBadge}>
                        <Text style={styles.bookedText}>Booked</Text>
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
                            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Amount</Text>
                            <Text style={[styles.totalValue, { color: colors.brand }]}>₹{calculateTotal()}</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: colors.border }]}
                            onPress={() => setShowBookingModal(false)}
                        >
                            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn}>
                            <Icon name="calendar-check" size={18} color="#FFFFFF" />
                            <Text style={styles.confirmBtnText}>Book Hall</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Function Hall" subtitle={customer?.name || 'Guest'} />

            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
            </TouchableOpacity>

            <FlatList
                data={FUNCTION_HALLS}
                keyExtractor={(item) => item.id}
                renderItem={renderHallCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Available Venues</Text>
                }
            />

            {renderBookingModal()}
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
});

export default FunctionHallScreen;
