import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import QRCode from 'react-native-qrcode-svg';
import LottieView from 'lottie-react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { SlideUp, FadeIn, ScaleIn } from '../utils/animations';
import * as api from '../utils/api';

const { width } = Dimensions.get('window');

// Lottie animation
const RoomLoadingAnimation = require('../assets/room.json');

const RoomCheckoutScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const { customer, room } = route.params;

    const [loading, setLoading] = useState(false);
    const [uploadingAadhar, setUploadingAadhar] = useState(false);
    const [uploadingPan, setUploadingPan] = useState(false);

    // Form State
    const [aadharImage, setAadharImage] = useState(null);
    const [panImage, setPanImage] = useState(null);
    const [extraBeds, setExtraBeds] = useState(0);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');

    // Date & Time State
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date(new Date().getTime() + 24 * 60 * 60 * 1000));
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [pickerType, setPickerType] = useState('in'); // 'in' or 'out'

    // Pricing Logic
    const pricing = useMemo(() => {
        if (!room) return { days: 0, roomTotal: 0, extraBedTotal: 0, total: 0 };

        const diffTime = checkOutDate.getTime() - checkInDate.getTime();
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        const roomTotal = room.price * diffDays;
        const extraBedTotal = extraBeds * 1500 * diffDays;

        return {
            days: diffDays,
            roomTotal,
            extraBedTotal,
            total: roomTotal + extraBedTotal
        };
    }, [room, checkInDate, checkOutDate, extraBeds]);

    const showDatePicker = (type) => {
        setPickerType(type);
        setDatePickerVisibility(true);
    };

    const hideDatePicker = () => {
        setDatePickerVisibility(false);
    };

    const handleConfirmDate = (date) => {
        if (pickerType === 'in') {
            setCheckInDate(date);
            // Ensure checkout is at least the next day
            if (date >= checkOutDate) {
                setCheckOutDate(new Date(date.getTime() + 24 * 60 * 60 * 1000));
            }
        } else {
            if (date <= checkInDate) {
                Alert.alert('Invalid Date', 'Check-out date must be after check-in date');
            } else {
                setCheckOutDate(date);
            }
        }
        hideDatePicker();
    };

    const handlePickImage = (type) => {
        const options = {
            mediaType: 'photo',
            quality: 0.7,
            includeBase64: true,
        };

        launchImageLibrary(options, async (response) => {
            if (response.didCancel) return;
            if (response.errorCode) {
                Alert.alert('Error', response.errorMessage);
                return;
            }

            const asset = response.assets[0];
            const fileName = asset.fileName || `document_${Date.now()}.jpg`;
            const fileType = asset.type || 'image/jpeg';

            if (type === 'aadhar') {
                setUploadingAadhar(true);
                try {
                    const { publicUrl } = await api.uploadRoomImage(asset.base64, fileName, fileType);
                    setAadharImage(publicUrl);
                } catch (error) {
                    Alert.alert('Upload Failed', 'Failed to upload Aadhar photo');
                } finally {
                    setUploadingAadhar(false);
                }
            } else {
                setUploadingPan(true);
                try {
                    const { publicUrl } = await api.uploadRoomImage(asset.base64, fileName, fileType);
                    setPanImage(publicUrl);
                } catch (error) {
                    Alert.alert('Upload Failed', 'Failed to upload PAN photo');
                } finally {
                    setUploadingPan(false);
                }
            }
        });
    };

    const handleConfirmBooking = async () => {
        if (!aadharImage) {
            Alert.alert('Details Required', 'Please upload Aadhar card photo.');
            return;
        }

        const startTime = Date.now();
        setLoading(true);
        try {
            const bookingData = {
                customerId: customer.customerId || customer.id,
                customerName: customer.name,
                customerMobile: customer.mobile,
                items: [
                    {
                        name: `${room.name} (${pricing.days} Days)`,
                        price: room.price,
                        days: pricing.days,
                        extraBeds: extraBeds,
                        extraBedCost: extraBeds * 1500 * pricing.days,
                        type: room.ac ? 'AC' : 'Non-AC',
                        checkIn: checkInDate.toLocaleString(),
                        checkOut: checkOutDate.toLocaleString(),
                        subtotal: pricing.total
                    }
                ],
                totalAmount: pricing.total,
                paymentMethod: selectedPaymentMethod === 'cash' ? 'Cash' : 'UPI',
                service: 'ROOM',
                status: 'CONFIRMED',
                aadharUrl: aadharImage,
                panUrl: panImage,
                orderTime: new Date().toISOString(),
                timestamp: new Date().toISOString()
            };

            await api.saveBooking(bookingData);

            // Ensure minimum 5 seconds loading animation
            const elapsed = Date.now() - startTime;
            const minLoadTime = 5000;
            const remainingTime = Math.max(0, minLoadTime - elapsed);

            setTimeout(() => {
                setLoading(false);
                Alert.alert('Success', 'Room booked successfully!', [
                    { text: 'OK', onPress: () => navigation.navigate('CustomerHistory', { customer }) }
                ]);
            }, remainingTime);
        } catch (error) {
            setLoading(false);
            Alert.alert('Error', 'Failed to save booking: ' + error.message);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: '#6D9788' }]}>
                <Header title="Confirming" subtitle="Securing your room..." />
                <View style={styles.loadingContainer}>
                    <LottieView
                        source={RoomLoadingAnimation}
                        autoPlay
                        loop
                        style={styles.lottieAnimation}
                    />
                    <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>
                        Processing your booking...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Room Checkout" subtitle={customer?.name || 'Guest'} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                        <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
                    </TouchableOpacity>

                    {/* Customer Info Card */}
                    <SlideUp delay={100}>
                        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.sectionHeader}>
                                <Icon name="account-details" size={20} color={colors.brand} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Customer Details</Text>
                            </View>
                            <View style={styles.infoGrid}>
                                <View style={styles.infoItem}><Text style={styles.infoLabel}>Name</Text><Text style={[styles.infoValue, { color: colors.textPrimary }]}>{customer.name}</Text></View>
                                <View style={styles.infoItem}><Text style={styles.infoLabel}>Mobile</Text><Text style={[styles.infoValue, { color: colors.textPrimary }]}>{customer.mobile}</Text></View>
                                <View style={styles.infoItem}><Text style={styles.infoLabel}>Vehicle No</Text><Text style={[styles.infoValue, { color: colors.textPrimary }]}>{customer.vehicleNo || 'N/A'}</Text></View>
                            </View>
                        </View>
                    </SlideUp>

                    {/* Booking Details */}
                    <SlideUp delay={200}>
                        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.sectionHeader}>
                                <Icon name="calendar-clock" size={20} color={colors.brand} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Stay Duration ({pricing.days} {pricing.days > 1 ? 'Days' : 'Day'})</Text>
                            </View>
                            <View style={styles.datePickerRow}>
                                <TouchableOpacity style={[styles.dateBox, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => showDatePicker('in')}>
                                    <View style={styles.dateIcon}><Icon name="calendar-import" size={20} color={colors.brand} /></View>
                                    <View>
                                        <Text style={styles.dateLabel}>Check-In</Text>
                                        <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{checkInDate.toLocaleDateString()}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.dateBox, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => showDatePicker('out')}>
                                    <View style={styles.dateIcon}><Icon name="calendar-export" size={20} color="#F43F5E" /></View>
                                    <View>
                                        <Text style={styles.dateLabel}>Check-Out</Text>
                                        <Text style={[styles.dateValue, { color: colors.textPrimary }]}>{checkOutDate.toLocaleDateString()}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SlideUp>

                    {/* Extra Services */}
                    <SlideUp delay={250}>
                        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.sectionHeader}>
                                <Icon name="bed-double-outline" size={20} color={colors.brand} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Extra Bed (₹1500 / day)</Text>
                            </View>
                            <View style={styles.counterRow}>
                                <TouchableOpacity
                                    style={[styles.countBtn, { backgroundColor: extraBeds > 0 ? colors.brand : colors.border }]}
                                    onPress={() => setExtraBeds(Math.max(0, extraBeds - 1))}
                                >
                                    <Icon name="minus" size={20} color="#FFF" />
                                </TouchableOpacity>
                                <Text style={[styles.countValue, { color: colors.textPrimary }]}>{extraBeds}</Text>
                                <TouchableOpacity
                                    style={[styles.countBtn, { backgroundColor: colors.brand }]}
                                    onPress={() => setExtraBeds(extraBeds + 1)}
                                >
                                    <Icon name="plus" size={20} color="#FFF" />
                                </TouchableOpacity>
                                {extraBeds > 0 && <Text style={[styles.subtotalHint, { color: colors.brand }]}>+₹{extraBeds * 1500 * pricing.days}</Text>}
                            </View>
                        </View>
                    </SlideUp>

                    {/* Document Upload */}
                    <SlideUp delay={300}>
                        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.sectionHeader}>
                                <Icon name="file-document-outline" size={20} color={colors.brand} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>ID Proof (S3 Proxy)</Text>
                            </View>
                            <View style={styles.docRow}>
                                <View style={styles.docItem}>
                                    <Text style={styles.inputLabel}>Aadhar Card *</Text>
                                    <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.background, borderColor: aadharImage ? colors.brand : colors.border }]} onPress={() => handlePickImage('aadhar')}>
                                        {uploadingAadhar ? <ActivityIndicator color={colors.brand} /> : aadharImage ? <Image source={{ uri: aadharImage }} style={styles.previewImage} /> : <Icon name="camera-plus" size={30} color={colors.textMuted} />}
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.docItem}>
                                    <Text style={styles.inputLabel}>PAN Card</Text>
                                    <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.background, borderColor: panImage ? colors.brand : colors.border }]} onPress={() => handlePickImage('pan')}>
                                        {uploadingPan ? <ActivityIndicator color={colors.brand} /> : panImage ? <Image source={{ uri: panImage }} style={styles.previewImage} /> : <Icon name="camera-plus" size={30} color={colors.textMuted} />}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </SlideUp>

                    {/* Booking Summary */}
                    <SlideUp delay={400}>
                        <View style={[styles.summaryCard, { backgroundColor: colors.brand + '10', borderColor: colors.brand }]}>
                            <View style={styles.summaryTop}>
                                <View>
                                    <Text style={[styles.summaryRoom, { color: colors.textPrimary }]}>{room.name}</Text>
                                    <Text style={styles.summarySub}>{room.ac ? 'Air Conditioned' : 'Non-AC'} • {pricing.days} Days</Text>
                                </View>
                                <Text style={[styles.summaryAmount, { color: colors.brand }]}>₹{pricing.total}</Text>
                            </View>
                            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.summaryDetail}>
                                <Text style={styles.detailLabel}>Room Charge (₹{room.price} x {pricing.days})</Text>
                                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>₹{pricing.roomTotal}</Text>
                            </View>
                            {extraBeds > 0 && (
                                <View style={styles.summaryDetail}>
                                    <Text style={styles.detailLabel}>Extra Bed (₹1500 x {extraBeds} x {pricing.days})</Text>
                                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>₹{pricing.extraBedTotal}</Text>
                                </View>
                            )}
                        </View>
                    </SlideUp>

                    {/* Payment & Action */}
                    <SlideUp delay={500}>
                        <View style={styles.paymentOptions}>
                            <TouchableOpacity style={[styles.payBtn, selectedPaymentMethod === 'cash' && { backgroundColor: '#10B981', borderColor: '#10B981' }]} onPress={() => setSelectedPaymentMethod('cash')}>
                                <Icon name="cash" size={24} color={selectedPaymentMethod === 'cash' ? '#FFF' : '#10B981'} />
                                <Text style={[styles.payText, selectedPaymentMethod === 'cash' && { color: '#FFF' }]}>Cash</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.payBtn, selectedPaymentMethod === 'upi' && { backgroundColor: colors.brand, borderColor: colors.brand }]} onPress={() => setSelectedPaymentMethod('upi')}>
                                <Icon name="qrcode-scan" size={24} color={selectedPaymentMethod === 'upi' ? '#FFF' : colors.brand} />
                                <Text style={[styles.payText, selectedPaymentMethod === 'upi' && { color: '#FFF' }]}>UPI/QR</Text>
                            </TouchableOpacity>
                        </View>
                        {selectedPaymentMethod === 'upi' && (
                            <View style={styles.qrSection}>
                                <QRCode value={api.getUPIString(pricing.total)} size={160} />
                                <Text style={[styles.qrHint, { color: colors.textPrimary }]}>Pay ₹{pricing.total} with any UPI app</Text>
                            </View>
                        )}
                        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.brand }]} onPress={handleConfirmBooking} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFF" /> : <><Icon name="check-decagram" size={24} color="#FFF" /><Text style={styles.confirmText}>Confirm Booking</Text></>}
                        </TouchableOpacity>
                    </SlideUp>
                </ScrollView>
            </KeyboardAvoidingView>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmDate}
                onCancel={hideDatePicker}
                date={pickerType === 'in' ? checkInDate : checkOutDate}
                minimumDate={pickerType === 'in' ? new Date() : new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 60 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
    sectionCard: { padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginLeft: 10 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    infoItem: { minWidth: '45%' },
    infoLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
    infoValue: { fontSize: 15, fontWeight: '600' },
    datePickerRow: { flexDirection: 'row', gap: 12 },
    dateBox: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
    dateIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
    dateLabel: { fontSize: 11, color: '#888' },
    dateValue: { fontSize: 14, fontWeight: '700' },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    countBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    countValue: { fontSize: 22, fontWeight: '800', minWidth: 30, textAlign: 'center' },
    subtotalHint: { fontSize: 14, fontWeight: '700' },
    docRow: { flexDirection: 'row', gap: 16 },
    docItem: { flex: 1 },
    inputLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
    imagePicker: { height: 130, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    summaryCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryRoom: { fontSize: 18, fontWeight: '800' },
    summarySub: { fontSize: 13, color: '#666', marginTop: 2 },
    summaryAmount: { fontSize: 24, fontWeight: '900' },
    summaryDivider: { height: 1, marginVertical: 15, opacity: 0.1 },
    summaryDetail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    detailLabel: { fontSize: 13, color: '#666' },
    detailValue: { fontSize: 13, fontWeight: '600' },
    paymentOptions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: '#eee', gap: 10 },
    payText: { fontSize: 15, fontWeight: '700', color: '#666' },
    qrSection: { alignItems: 'center', marginBottom: 24, padding: 20, backgroundColor: '#FFF', borderRadius: 20, alignSelf: 'center' },
    qrHint: { marginTop: 12, fontWeight: '700', fontSize: 15, textAlign: 'center' },
    confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, gap: 12, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    confirmText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottieAnimation: {
        width: width * 0.8,
        height: width * 0.8,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
});

export default RoomCheckoutScreen;
