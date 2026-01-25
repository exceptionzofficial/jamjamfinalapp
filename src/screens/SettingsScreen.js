import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { clearAllData } from '../utils/api';
import { SlideUp, FadeIn, ScaleIn } from '../utils/animations';

const SettingsScreen = () => {
    const { colors, isDarkMode, toggleTheme } = useTheme();

    const handleClearData = () => {
        Alert.alert(
            'Clear All Data',
            'This will delete all customer data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllData();
                        Alert.alert('Success', 'All data has been cleared.');
                    },
                },
            ]
        );
    };

    const SettingItem = ({ icon, title, subtitle, onPress, destructive, rightElement, delay }) => (
        <FadeIn delay={delay}>
            <TouchableOpacity
                style={styles.settingItem}
                onPress={onPress}
                activeOpacity={onPress ? 0.7 : 1}
                disabled={!onPress}
            >
                <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }, destructive && styles.iconDestructive]}>
                    <Icon name={icon} size={22} color={destructive ? '#F44336' : colors.accent} />
                </View>
                <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: colors.textPrimary }, destructive && styles.textDestructive]}>
                        {title}
                    </Text>
                    {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
                </View>
                {rightElement || (onPress && <Icon name="chevron-right" size={22} color={colors.textMuted} />)}
            </TouchableOpacity>
        </FadeIn>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Settings" subtitle="Customize your app" showTypewriter={true} />
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Appearance */}
                <SlideUp delay={100}>
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Appearance</Text>
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <SettingItem
                                icon={isDarkMode ? 'weather-night' : 'white-balance-sunny'}
                                title="Dark Mode"
                                subtitle={isDarkMode ? 'Dark theme enabled' : 'Light theme enabled'}
                                delay={150}
                                rightElement={
                                    <Switch
                                        value={isDarkMode}
                                        onValueChange={toggleTheme}
                                        trackColor={{ false: colors.border, true: colors.accent }}
                                        thumbColor={isDarkMode ? colors.textOnAccent : '#FFFFFF'}
                                    />
                                }
                            />
                        </View>
                    </View>
                </SlideUp>

                {/* App Info */}
                <SlideUp delay={200}>
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>App Information</Text>
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <SettingItem icon="information" title="App Version" subtitle="1.0.0" delay={250} />
                            <View style={[styles.divider, { backgroundColor: colors.border }]} />
                            <SettingItem icon="domain" title="Resort" subtitle="Sri Kalki Jam Jam Resorts" delay={300} />
                        </View>
                    </View>
                </SlideUp>

                {/* Employee Info */}
                <SlideUp delay={300}>
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Employee</Text>
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <SettingItem icon="account-tie" title="Employee Portal" subtitle="Booking & Services Management" delay={350} />
                        </View>
                    </View>
                </SlideUp>

                {/* Data Management */}
                <SlideUp delay={400}>
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Data Management</Text>
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <SettingItem
                                icon="delete"
                                title="Clear All Data"
                                subtitle="Delete all local customer data"
                                onPress={handleClearData}
                                destructive
                                delay={450}
                            />
                        </View>
                    </View>
                </SlideUp>

                {/* Footer */}
                <ScaleIn delay={500}>
                    <View style={styles.footer}>
                        <Icon name="palm-tree" size={32} color={colors.accent} />
                        <Text style={[styles.footerText, { color: colors.accent }]}>Sri Kalki Jam Jam Resorts</Text>
                        <Text style={[styles.footerSubtext, { color: colors.textMuted }]}>Employee Portal v1.0.0</Text>
                    </View>
                </ScaleIn>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconDestructive: {
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    textDestructive: {
        color: '#F44336',
    },
    settingSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginLeft: 66,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    footerText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    footerSubtext: {
        fontSize: 12,
        marginTop: 4,
    },
});

export default SettingsScreen;
