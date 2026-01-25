import { StyleSheet, Dimensions } from 'react-native';
import colors from './colors';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export const globalStyles = StyleSheet.create({
    // Containers
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: colors.primary,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Cards
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardElevated: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

    // Typography
    title: {
        fontSize: isTablet ? 28 : 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: isTablet ? 20 : 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    body: {
        fontSize: isTablet ? 16 : 14,
        color: colors.textSecondary,
    },
    caption: {
        fontSize: isTablet ? 14 : 12,
        color: colors.textMuted,
    },

    // Buttons
    buttonPrimary: {
        backgroundColor: colors.accent,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    buttonPrimaryText: {
        color: colors.textOnAccent,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    buttonSecondaryText: {
        color: colors.accent,
        fontSize: 16,
        fontWeight: '600',
    },

    // Inputs
    input: {
        backgroundColor: colors.surfaceLight,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 48,
    },
    inputLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        fontWeight: '500',
    },

    // Spacing
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spaceBetween: {
        justifyContent: 'space-between',
    },
    mb8: { marginBottom: 8 },
    mb16: { marginBottom: 16 },
    mb24: { marginBottom: 24 },
    mt8: { marginTop: 8 },
    mt16: { marginTop: 16 },
    p16: { padding: 16 },
    ph16: { paddingHorizontal: 16 },
    pv8: { paddingVertical: 8 },

    // Grid
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
    },
    gridItem: {
        width: isTablet ? '25%' : '50%',
        padding: 8,
    },
});

export default globalStyles;
