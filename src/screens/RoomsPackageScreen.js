import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    Image,
    ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { SlideUp, FadeIn } from '../utils/animations';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const ROOM_PACKAGES = [
    { id: '1', name: 'Semi Suite Hut', tamilName: 'குறிஞ்சி இல்லம்', price: 4000, size: '256 SQ.FT' },
    { id: '2', name: 'Semi Suite Hut', tamilName: 'முல்லை இல்லம்', price: 4200, size: '260 SQ.FT' },
    { id: '3', name: 'Semi Suite Hut', tamilName: 'மருதம் இல்லம்', price: 3800, size: '250 SQ.FT' },
    { id: '4', name: 'Semi Suite Hut', tamilName: 'நெய்தல் இல்லம்', price: 4500, size: '280 SQ.FT' },
    { id: '5', name: 'Semi Suite Hut', tamilName: 'பாலை இல்லம்', price: 4000, size: '256 SQ.FT' },
    { id: '6', name: 'Luxury Suite', tamilName: 'தாமரை இல்லம்', price: 5500, size: '350 SQ.FT' },
    { id: '7', name: 'Luxury Suite', tamilName: 'மல்லிகை இல்லம்', price: 5500, size: '350 SQ.FT' },
    { id: '8', name: 'Premium Hut', tamilName: 'ரோஜா இல்லம்', price: 4800, size: '300 SQ.FT' },
    { id: '9', name: 'Premium Hut', tamilName: 'லில்லி இல்லம்', price: 4800, size: '300 SQ.FT' },
    { id: '10', name: 'Standard Room', tamilName: 'செம்பருத்தி இல்லம்', price: 3500, size: '220 SQ.FT' },
    { id: '11', name: 'Standard Room', tamilName: 'டெய்சி இல்லம்', price: 3500, size: '220 SQ.FT' },
    { id: '12', name: 'Family Suite', tamilName: 'சூரியகாந்தி இல்லம்', price: 6000, size: '450 SQ.FT' },
    { id: '13', name: 'Executive Room', tamilName: 'ஆர்க்கிட் இல்லம்', price: 5200, size: '320 SQ.FT' },
];

const FACILITIES = [
    { name: 'FREE BREAKFAST', icon: 'food-croissant' },
    { name: 'FREE PARKING', icon: 'car-parking' },
    { name: 'LIVING AREA', icon: 'sofa' },
    { name: 'FREE WIFI', icon: 'wifi' },
    { name: 'RESTAURANTS', icon: 'silverware-fork-knife' },
    { name: '24HRS SAFETY & SECURITY', icon: 'camera-account' },
];

const RoomsPackageScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const customer = route?.params?.customer;

    const renderPackageItem = ({ item, index }) => (
        <SlideUp style={styles.cardWrapper} delay={index * 100}>
            <View style={[styles.card, { backgroundColor: '#F9D423' }]}>
                {/* Top Section with Image and Main Info */}
                <View style={styles.topSection}>
                    <View style={styles.imageContainer}>
                        {/* Placeholder for Room Image - using a generic background or placeholder if actual image not available */}
                        <View style={styles.placeholderImg}>
                            <Icon name="home-city" size={60} color="#555" />
                        </View>
                        <View style={styles.tamilNameOverlay}>
                            <Text style={styles.tamilNameSmall}>{item.tamilName}</Text>
                        </View>
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.roomType}>{item.name}</Text>
                        <Text style={styles.tamilNameBig}>{item.tamilName}</Text>

                        <View style={styles.priceContainer}>
                            <Text style={styles.perDay}>PER DAY</Text>
                            <Text style={styles.currency}>INR ₹ </Text>
                            <Text style={styles.price}>{item.price.toLocaleString()}</Text>
                        </View>
                        <Text style={styles.exclusive}>EXCLUSIVE OF TAXES</Text>

                        <View style={styles.sizeBadge}>
                            <Text style={styles.sizeText}>{item.size}</Text>
                        </View>
                    </View>
                </View>

                {/* Sub Images Section */}
                <View style={styles.subImagesRow}>
                    <View style={styles.subImagePlaceholder} />
                    <View style={styles.subImagePlaceholder} />
                    <View style={styles.subImagePlaceholder} />
                </View>

                {/* Facility Section */}
                <View style={styles.facilitySection}>
                    <Text style={styles.facilityTitle}>FACILITY</Text>
                    <View style={styles.facilityGrid}>
                        {FACILITIES.map((fac, idx) => (
                            <View key={idx} style={styles.facilityItem}>
                                <View style={styles.facilityIconCircle}>
                                    <Icon name={fac.icon} size={20} color="#000" />
                                </View>
                                <Text style={styles.facilityName}>{fac.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Footer Section */}
                <View style={styles.footerSection}>
                    <View style={styles.footerRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.footerText}>Extra Bed charges RS:1500 <Text style={styles.boldText}>PER-PERSON-ONLY</Text></Text>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.bullet} />
                        <View style={styles.acContainer}>
                            <Text style={styles.footerText}>AC ROOM</Text>
                            <Icon name="air-conditioner" size={24} color="#000" style={{ marginLeft: 10 }} />
                        </View>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.policyText}>By proceeding with this booking. I agree to Sri Kalki Jam Jam Resorts Terms of Use and Privacy Policy.</Text>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.policyText}>Cancellation is allowed only 7 days before checkin date</Text>
                    </View>
                </View>

                {/* Book Button */}
                <TouchableOpacity style={styles.bookButton} activeOpacity={0.8}>
                    <Text style={styles.bookButtonText}>BOOK NOW</Text>
                    <Icon name="chevron-right" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SlideUp>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Rooms Packages" subtitle={customer?.name || 'Guest'} />

            <View style={styles.navBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                    <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
                </TouchableOpacity>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{ROOM_PACKAGES.length} AVAILABLE</Text>
                </View>
            </View>

            <FlatList
                data={ROOM_PACKAGES}
                keyExtractor={(item) => item.id}
                renderItem={renderPackageItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10
    },
    backBtn: { flexDirection: 'row', alignItems: 'center' },
    backText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
    badge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20
    },
    badgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
    listContent: { padding: 12, paddingBottom: 100 },
    cardWrapper: { marginBottom: 20 },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        padding: 15,
        borderWidth: 2,
        borderColor: '#000',
    },
    topSection: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    imageContainer: {
        width: '50%',
        aspectRatio: 1,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#FFF',
        overflow: 'hidden',
    },
    placeholderImg: {
        flex: 1,
        backgroundColor: '#EAEAEA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tamilNameOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tamilNameSmall: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
        paddingLeft: 15,
        justifyContent: 'center',
    },
    roomType: {
        fontSize: 22,
        fontWeight: '900',
        color: '#000',
        textTransform: 'uppercase',
    },
    tamilNameBig: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 5,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 15,
    },
    perDay: {
        fontSize: 10,
        fontWeight: '900',
        color: '#000',
    },
    currency: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000',
        marginLeft: 5,
    },
    price: {
        fontSize: 24,
        fontWeight: '900',
        color: '#000',
    },
    exclusive: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#555',
        marginTop: -5,
    },
    sizeBadge: {
        borderWidth: 1.5,
        borderColor: '#000',
        borderStyle: 'dashed',
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    sizeText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000',
    },
    subImagesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    subImagePlaceholder: {
        width: '31%',
        aspectRatio: 1.2,
        backgroundColor: '#EAEAEA',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    facilitySection: {
        borderWidth: 1,
        borderColor: '#555',
        borderStyle: 'dashed',
        borderRadius: 15,
        padding: 10,
        marginBottom: 15,
    },
    facilityTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#8B0000',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 2,
    },
    facilityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    facilityItem: {
        width: '33%',
        alignItems: 'center',
        marginBottom: 12,
    },
    facilityIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    facilityName: {
        fontSize: 7.5,
        fontWeight: '900',
        color: '#8B0000',
        textAlign: 'center',
    },
    footerSection: {
        paddingHorizontal: 5,
        marginBottom: 20,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        backgroundColor: '#000',
        marginTop: 6,
        marginRight: 10,
    },
    footerText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#000',
    },
    boldText: {
        fontWeight: '900',
    },
    acContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    policyText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#000',
        lineHeight: 16,
        flex: 1,
    },
    bookButton: {
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 10,
    },
    bookButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
        marginRight: 10,
    },
});

export default RoomsPackageScreen;
