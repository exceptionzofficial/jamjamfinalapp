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

import * as api from '../utils/api';

// Safe Dimensions access with fallback
let isTablet = false;
try {
    isTablet = Dimensions.get('window').width >= 768;
} catch (error) {
    console.warn('Dimensions not available during RoomsBookingScreen initialization');
}

const RoomsBookingScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const customer = route?.params?.customer;

    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [selectedRoomNumber, setSelectedRoomNumber] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingType, setBookingType] = useState('daily'); // hourly or daily
    const [duration, setDuration] = useState('1');
    const [guestCount, setGuestCount] = useState('2');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch rooms on mount
    React.useEffect(() => {
        const loadRooms = async () => {
            try {
                const data = await api.getRooms();
                console.log('DEBUG: Fetched rooms:', JSON.stringify(data));
                setRooms(data);
            } catch (error) {
                console.error('Error fetching rooms:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadRooms();
    }, []);

    const handleSelectRoom = (room) => {
        setSelectedRoom(room);
        setSelectedRoomNumber(room.roomNumbers?.[0] || null);
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
                    { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => handleSelectRoom(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.roomIconContainer, { backgroundColor: colors.brand }]}>
                    <Icon name={item.icon || (item.ac ? 'bed-king' : 'bed')} size={32} color="#FFFFFF" />
                </View>
                <View style={styles.roomInfo}>
                    <Text style={[styles.roomName, { color: colors.textPrimary }]}>{item.name}</Text>
                    {item.tamilName && (
                        <Text style={[styles.roomTamilName, { color: colors.textSecondary }]}>{item.tamilName}</Text>
                    )}
                    <View style={styles.roomMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: item.ac ? '#3B82F6' : '#F59E0B' }]}>
                            <Text style={styles.typeText}>{item.ac ? 'AC' : 'Non-AC'}</Text>
                        </View>
                        <Icon name="ruler-square" size={14} color={colors.textMuted} />
                        <Text style={[styles.capacityText, { color: colors.textMuted }]}>{item.size}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={[styles.priceLabel, { color: colors.brand }]}>₹{item.price}/day</Text>
                        <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{item.roomNumbers?.length || 0} Rooms Avail</Text>
                    </View>
                </View>
                <Icon name="chevron-right" size={24} color={colors.textMuted} />
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
                                <Icon name={selectedRoom.icon || 'bed'} size={28} color={colors.brand} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.selectedRoomName, { color: colors.textPrimary }]}>{selectedRoom.name}</Text>
                                    <Text style={[styles.selectedRoomType, { color: colors.textSecondary }]}>{selectedRoom.ac ? 'AC' : 'Non-AC'} | {selectedRoom.size}</Text>
                                </View>
                            </View>
                        )}

                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Room Number</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={[styles.roomNumbersRow, { paddingBottom: 10 }]}
                        >
                            {selectedRoom?.roomNumbers?.map((roomNum) => (
                                <TouchableOpacity
                                    key={roomNum}
                                    style={[
                                        styles.roomNumberChip,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                            marginRight: 8
                                        },
                                        selectedRoomNumber === roomNum && { backgroundColor: colors.brand, borderColor: colors.brand }
                                    ]}
                                    onPress={() => setSelectedRoomNumber(roomNum)}
                                >
                                    <Text style={[
                                        styles.roomNumberText,
                                        { color: colors.textPrimary },
                                        selectedRoomNumber === roomNum && { color: '#FFFFFF' }
                                    ]}>
                                        {roomNum}
                                    </Text>
                                </TouchableOpacity>
                            )) || <Text style={{ color: colors.textMuted }}>No rooms available</Text>}
                        </ScrollView>

                        <View style={[styles.totalContainer, { borderTopColor: colors.border }]}>
                            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Room Price</Text>
                            <Text style={[styles.totalValue, { color: colors.brand }]}>₹{selectedRoom?.price || calculateTotal()}</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: colors.border }]}
                            onPress={() => setShowBookingModal(false)}
                        >
                            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={() => {
                                setShowBookingModal(false);
                                navigation.navigate('RoomCheckout', {
                                    room: { ...selectedRoom, selectedRoomNumber },
                                    customer,
                                    bookingDetails: {
                                        type: bookingType,
                                        duration: parseInt(duration) || 1,
                                        guests: parseInt(guestCount) || 1,
                                        roomNumber: selectedRoomNumber
                                    }
                                });
                            }}
                        >
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
                data={rooms}
                keyExtractor={(item) => item.id}
                renderItem={renderRoomCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={isLoading}
                onRefresh={() => {/* Implement refresh if needed */ }}
                ListHeaderComponent={
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Available Packages</Text>
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
    roomTamilName: { fontSize: 14, marginBottom: 4 },
    roomNumbersRow: { gap: 8, paddingVertical: 8 },
    roomNumberChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    roomNumberText: { fontWeight: '600' },
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
