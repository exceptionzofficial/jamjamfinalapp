import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Safe Dimensions access with fallback
let isTablet = false;
try {
    isTablet = Dimensions.get('window').width >= 768;
} catch (error) {
    console.warn('Dimensions not available during ServiceCard initialization');
}

// Service definitions with icons and colors
export const SERVICES = [
    { id: 'games', name: 'Games', subtitle: 'Arcade & VR games', icon: 'gamepad-variant', bgColor: '#3B82F6' },
    { id: 'restaurants', name: 'Restaurants', subtitle: 'Fine dining experience', icon: 'silverware-fork-knife', bgColor: '#10B981' },
    { id: 'bakery', name: 'Bakery', subtitle: 'Fresh baked goods', icon: 'cupcake', bgColor: '#EC4899' },
    { id: 'juice', name: 'Juice Bar', subtitle: 'Fresh juices & smoothies', icon: 'cup', bgColor: '#F59E0B' },
    { id: 'massage', name: 'Massage', subtitle: 'Relaxing spa treatments', icon: 'spa', bgColor: '#8B5CF6' },
    { id: 'pool', name: 'Pool', subtitle: 'Swimming pool access', icon: 'pool', bgColor: '#06B6D4' },
    { id: 'rooms', name: 'Rooms', subtitle: 'Luxury room booking', icon: 'bed', bgColor: '#EF4444' },
    { id: 'theater', name: 'Theater', subtitle: 'Movie screenings', icon: 'theater', bgColor: '#F97316' },
    { id: 'functionhalls', name: 'Function Halls', subtitle: 'Events & celebrations', icon: 'party-popper', bgColor: '#6366F1' },
    { id: 'bar', name: 'Bar', subtitle: 'Premium beverages', icon: 'glass-cocktail', bgColor: '#DC2626' },
];

const ServiceCard = ({ service, onPress }) => {
    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: service.bgColor }]}
            onPress={() => onPress?.(service)}
            activeOpacity={0.85}
        >
            {/* Icon with background */}
            <View style={styles.iconWrapper}>
                <Icon
                    name={service.icon}
                    size={isTablet ? 32 : 26}
                    color="#FFFFFF"
                />
            </View>

            {/* Text content */}
            <View style={styles.textContent}>
                <Text style={styles.name} numberOfLines={1}>
                    {service.name}
                </Text>
                {service.subtitle && (
                    <View style={styles.subtitleRow}>
                        <Text style={styles.subtitle} numberOfLines={2}>
                            {service.subtitle}
                        </Text>
                        <Icon name="arrow-right" size={14} color="rgba(255,255,255,0.7)" />
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 14,
        padding: isTablet ? 16 : 12,
        minHeight: isTablet ? 120 : 100,
        justifyContent: 'space-between',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    iconWrapper: {
        width: isTablet ? 46 : 40,
        height: isTablet ? 46 : 40,
        borderRadius: isTablet ? 12 : 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    textContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    name: {
        fontSize: isTablet ? 15 : 13,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 3,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subtitle: {
        fontSize: isTablet ? 11 : 10,
        color: 'rgba(255, 255, 255, 0.85)',
        flex: 1,
        lineHeight: 14,
    },
});

export default ServiceCard;
