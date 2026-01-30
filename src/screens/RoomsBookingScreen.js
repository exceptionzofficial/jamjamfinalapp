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

// Sample Room Data (Frontend Only)
const ROOMS = [
    { id: 'room_1', name: 'Deluxe Suite', type: 'AC', capacity: 4, pricePerHour: 500, pricePerDay: 3500, available: true, icon: 'bed-king' },
    { id: 'room_2', name: 'Premium Room', type: 'AC', capacity: 2, pricePerHour: 350, pricePerDay: 2500, available: true, icon: 'bed-queen' },
    { id: 'room_3', name: 'Standard Room', type: 'Non-AC', capacity: 2, pricePerHour: 200, pricePerDay: 1500, available: false, icon: 'bed' },
    { id: 'room_4', name: 'Family Suite', type: 'AC', capacity: 6, pricePerHour: 700, pricePerDay: 5000, available: true, icon: 'home-group' },
    { id: 'room_5', name: 'Cottage', type: 'AC', capacity: 4, pricePerHour: 600, pricePerDay: 4000, available: true, icon: 'home' },
];

const RoomsBookingScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const customer = route?.params?.customer;

    const [selectedRoom, setSelectedRoom] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingType, setBookingType] = useState('hourly'); // hourly or daily
    const [duration, setDuration] = useState('1');
    const [guestCount, setGuestCount] = useState('2');

    const handleSelectRoom = (room) => {
        if (!room.available) return;
        setSelectedRoom(room);
        setShowBookingModal(true);
    };

    const calculateTotal = () => {
        if (!selectedRoom) return 0;
        const durationNum = parseInt(duration) || 1;
        const price = bookingType === 'hourly' ? selectedRoom.pricePerHour : selectedRoom.pricePerDay;
        return price * durationNum;
    };

    const renderRoomCard = ({ item }) => (
        <SlideUp style={styles.cardWrapper}>
            <TouchableOpacity
                style={[
                    styles.roomCard,
                    { backgroundColor: colors.card, borderColor: item.available ? colors.border : '#EF4444' },
                    !item.available && styles.unavailableCard,
                ]}
                onPress={() => handleSelectRoom(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.roomIconContainer, { backgroundColor: item.available ? '#10B981' : '#EF4444' }]}>
                    <Icon name={item.icon} size={32} color="#FFFFFF" />
                </View>
                <View style={styles.roomInfo}>
                    <Text style={[styles.roomName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <View style={styles.roomMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: item.type === 'AC' ? '#3B82F6' : '#F59E0B' }]}>
                            <Text style={styles.typeText}>{item.type}</Text>
                        </View>
                        <Icon name="account-group" size={14} color={colors.textMuted} />
                        <Text style={[styles.capacityText, { color: colors.textMuted }]}>{item.capacity} Guests</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>₹{item.pricePerHour}/hr</Text>
                        <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>₹{item.pricePerDay}/day</Text>
                    </View>
                </View>
                {item.available ? (
                    <Icon name="chevron-right" size={24} color={colors.textMuted} />
                ) : (
                    <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableText}>Booked</Text>
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
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Book Room</Text>
                            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {selectedRoom && (
                            <View style={[styles.selectedRoomCard, { backgroundColor: colors.background }]}>
                                <Icon name={selectedRoom.icon} size={28} color={colors.brand} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.selectedRoomName, { color: colors.textPrimary }]}>{selectedRoom.name}</Text>
                                    <Text style={[styles.selectedRoomType, { color: colors.textSecondary }]}>{selectedRoom.type} | {selectedRoom.capacity} Guests</Text>
                                </View>
                            </View>
                        )}

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
                                <Text style={[styles.toggleText, bookingType === 'daily' && { color: '#FFFFFF' }]}>Daily</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Duration ({bookingType === 'hourly' ? 'Hours' : 'Days'})</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            value={duration}
                            onChangeText={setDuration}
                            keyboardType="numeric"
                            placeholder="Enter duration"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Number of Guests</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                            value={guestCount}
                            onChangeText={setGuestCount}
                            keyboardType="numeric"
                            placeholder="Enter guest count"
                            placeholderTextColor={colors.textMuted}
                        />

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
                            <Icon name="check" size={18} color="#FFFFFF" />
                            <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Rooms Booking" subtitle={customer?.name || 'Guest'} />

            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
            </TouchableOpacity>

            <FlatList
                data={ROOMS}
                keyExtractor={(item) => item.id}
                renderItem={renderRoomCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Available Rooms</Text>
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
    roomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    unavailableCard: { opacity: 0.6 },
    roomIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    roomInfo: { flex: 1 },
    roomName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    typeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    capacityText: { fontSize: 12, marginLeft: 4 },
    priceRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
    priceLabel: { fontSize: 13, fontWeight: '600' },
    unavailableBadge: { backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    unavailableText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    selectedRoomCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 20 },
    selectedRoomName: { fontSize: 16, fontWeight: '700' },
    selectedRoomType: { fontSize: 13, marginTop: 2 },
    sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
    toggleRow: { flexDirection: 'row', gap: 12 },
    toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
    toggleText: { fontSize: 14, fontWeight: '600', color: '#333' },
    input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
    totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginTop: 20, borderTopWidth: 1 },
    totalLabel: { fontSize: 16, fontWeight: '600' },
    totalValue: { fontSize: 24, fontWeight: '800' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    cancelBtnText: { fontSize: 15, fontWeight: '600' },
    confirmBtn: { flex: 1.5, flexDirection: 'row', backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
    confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

export default RoomsBookingScreen;
