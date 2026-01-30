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
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { SlideUp, FadeIn } from '../utils/animations';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Sample Theater/Show Data (Frontend Only)
const SHOWS = [
    { id: 'show_1', name: 'Magic Show', time: '11:00 AM', duration: '45 min', price: 150, seatsAvailable: 48, icon: 'magic-staff' },
    { id: 'show_2', name: 'Dance Performance', time: '02:00 PM', duration: '60 min', price: 200, seatsAvailable: 32, icon: 'dance-ballroom' },
    { id: 'show_3', name: 'Comedy Night', time: '05:00 PM', duration: '90 min', price: 250, seatsAvailable: 0, icon: 'emoticon-lol' },
    { id: 'show_4', name: 'Musical Concert', time: '07:30 PM', duration: '120 min', price: 350, seatsAvailable: 25, icon: 'music' },
    { id: 'show_5', name: 'Kids Puppet Show', time: '10:00 AM', duration: '30 min', price: 100, seatsAvailable: 60, icon: 'teddy-bear' },
];

// Seat Categories
const SEAT_CATEGORIES = [
    { id: 'regular', name: 'Regular', multiplier: 1, color: '#6B7280' },
    { id: 'premium', name: 'Premium', multiplier: 1.5, color: '#3B82F6' },
    { id: 'vip', name: 'VIP', multiplier: 2, color: '#F59E0B' },
];

const TheaterBookingScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const customer = route?.params?.customer;

    const [selectedShow, setSelectedShow] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [seatCategory, setSeatCategory] = useState(SEAT_CATEGORIES[0]);
    const [ticketCount, setTicketCount] = useState('2');

    const handleSelectShow = (show) => {
        if (show.seatsAvailable === 0) return;
        setSelectedShow(show);
        setShowBookingModal(true);
    };

    const calculateTotal = () => {
        if (!selectedShow) return 0;
        const count = parseInt(ticketCount) || 1;
        return Math.round(selectedShow.price * seatCategory.multiplier * count);
    };

    const renderShowCard = ({ item }) => (
        <SlideUp style={styles.cardWrapper}>
            <TouchableOpacity
                style={[
                    styles.showCard,
                    { backgroundColor: colors.card, borderColor: item.seatsAvailable > 0 ? colors.border : '#EF4444' },
                    item.seatsAvailable === 0 && styles.soldOutCard,
                ]}
                onPress={() => handleSelectShow(item)}
                activeOpacity={0.8}
            >
                <View style={[styles.showIconContainer, { backgroundColor: item.seatsAvailable > 0 ? '#8B5CF6' : '#EF4444' }]}>
                    <Icon name={item.icon} size={32} color="#FFFFFF" />
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
                {item.seatsAvailable > 0 ? (
                    <View style={styles.seatsInfo}>
                        <Text style={[styles.seatsCount, { color: colors.brand }]}>{item.seatsAvailable}</Text>
                        <Text style={[styles.seatsLabel, { color: colors.textMuted }]}>seats</Text>
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
            onRequestClose={() => setShowBookingModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Book Tickets</Text>
                            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {selectedShow && (
                            <View style={[styles.selectedShowCard, { backgroundColor: colors.background }]}>
                                <View style={[styles.showBadge, { backgroundColor: '#8B5CF6' }]}>
                                    <Icon name={selectedShow.icon} size={24} color="#FFFFFF" />
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
                                style={[styles.ticketBtn, { backgroundColor: colors.background }]}
                                onPress={() => setTicketCount(String(Math.max(1, (parseInt(ticketCount) || 1) - 1)))}
                            >
                                <Icon name="minus" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.ticketCount, { color: colors.textPrimary }]}>{ticketCount}</Text>
                            <TouchableOpacity
                                style={[styles.ticketBtn, { backgroundColor: colors.background }]}
                                onPress={() => setTicketCount(String((parseInt(ticketCount) || 1) + 1))}
                            >
                                <Icon name="plus" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
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
                            <Icon name="ticket-confirmation" size={18} color="#FFFFFF" />
                            <Text style={styles.confirmBtnText}>Book Tickets</Text>
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

            <FlatList
                data={SHOWS}
                keyExtractor={(item) => item.id}
                renderItem={renderShowCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Today's Shows</Text>
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
    seatsInfo: { alignItems: 'center' },
    seatsCount: { fontSize: 20, fontWeight: '800' },
    seatsLabel: { fontSize: 10, textTransform: 'uppercase' },
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
});

export default TheaterBookingScreen;
