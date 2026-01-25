import React, { useState, useCallback, memo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';

// Memoized SearchBar to prevent unnecessary re-renders
const SearchBar = memo(({ onSearch, placeholder, onClear }) => {
    const { colors } = useTheme();
    const [localValue, setLocalValue] = useState('');

    const handleChangeText = useCallback((text) => {
        setLocalValue(text);
        if (onSearch) {
            onSearch(text);
        }
    }, [onSearch]);

    const handleClear = useCallback(() => {
        setLocalValue('');
        if (onClear) {
            onClear();
        }
    }, [onClear]);

    return (
        <View style={[styles.container, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
            <Icon name="magnify" size={22} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={localValue}
                onChangeText={handleChangeText}
                placeholder={placeholder || 'Search by name or mobile...'}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                blurOnSubmit={false}
            />
            {localValue.length > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                    <Icon name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        minHeight: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 12,
    },
    clearButton: {
        padding: 4,
    },
});

export default SearchBar;
