import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';
import { formatDateTime } from '../utils/storage';

const CustomerCard = ({ customer, onPress, onCheckout, showCheckin = true, showCheckout = false }) => {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onPress?.(customer)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                <Icon name="account" size={28} color={colors.accent} />
            </View>
            <View style={styles.content}>
                <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>{customer.name}</Text>
                    {customer.isVisitor && (
                        <View style={[styles.visitorBadge, { backgroundColor: '#F59E0B' }]}>
                            <Text style={styles.visitorTagText}>VISITOR</Text>
                        </View>
                    )}
                </View>
                <View style={styles.row}>
                    <Icon name="phone" size={14} color={colors.textMuted} />
                    <Text style={[styles.mobile, { color: colors.textSecondary }]}>{customer.mobile}</Text>
                </View>
                {customer.vehicleNo && (
                    <View style={styles.row}>
                        <Icon name="car" size={14} color={colors.textMuted} />
                        <Text style={[styles.detail, { color: colors.textMuted }]}>{customer.vehicleNo}</Text>
                    </View>
                )}
                {showCheckin && customer.checkinTime && (
                    <View style={styles.row}>
                        <Icon name="clock-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.detail, { color: colors.textMuted }]}>{formatDateTime(customer.checkinTime)}</Text>
                    </View>
                )}
            </View>

            {showCheckout ? (
                <TouchableOpacity
                    style={[styles.checkoutBtn, { backgroundColor: '#FF6B6B' }]}
                    onPress={() => onCheckout?.(customer)}
                >
                    <Icon name="logout-variant" size={16} color="#FFFFFF" />
                    <Text style={styles.checkoutText}>Checkout</Text>
                </TouchableOpacity>
            ) : (
                <Icon name="chevron-right" size={24} color={colors.textMuted} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 16,
        marginVertical: 6,
        borderWidth: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    mobile: {
        fontSize: 14,
        marginLeft: 6,
    },
    detail: {
        fontSize: 12,
        marginLeft: 6,
    },
    checkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
    },
    checkoutText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    visitorBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    visitorTagText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
    },
});

export default CustomerCard;
