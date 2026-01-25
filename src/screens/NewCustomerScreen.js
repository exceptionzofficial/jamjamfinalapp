import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { saveCustomer, formatDateTime } from '../utils/api';
import { SlideUp, FadeIn, ScaleIn } from '../utils/animations';

const NewCustomerScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [vehicleNo, setVehicleNo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const checkinTime = new Date().toISOString();

    const validateForm = () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter customer name');
            return false;
        }
        if (!mobile.trim()) {
            Alert.alert('Required', 'Please enter mobile number');
            return false;
        }
        if (mobile.length < 10) {
            Alert.alert('Invalid', 'Please enter a valid mobile number');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const customer = {
                name: name.trim(),
                mobile: mobile.trim(),
                vehicleNo: vehicleNo.trim() || null,
            };

            const savedCustomer = await saveCustomer(customer);

            Alert.alert(
                'Success',
                `Customer registered successfully!\n\nID: ${savedCustomer.customerId}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch {
            Alert.alert('Error', 'Failed to register customer. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="New Customer" subtitle="Registration" showTypewriter={true} />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <SlideUp delay={100}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                            <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
                        </TouchableOpacity>
                    </SlideUp>

                    <ScaleIn delay={200}>
                        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {/* Name Field */}
                            <FadeIn delay={300}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                                        Customer Name <Text style={styles.required}>*</Text>
                                    </Text>
                                    <View style={[styles.inputContainer, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                                        <Icon name="account" size={20} color={colors.textMuted} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.textPrimary }]}
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Enter customer name"
                                            placeholderTextColor={colors.textMuted}
                                            autoCapitalize="words"
                                        />
                                    </View>
                                </View>
                            </FadeIn>

                            {/* Mobile Field */}
                            <FadeIn delay={400}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                                        Mobile Number <Text style={styles.required}>*</Text>
                                    </Text>
                                    <View style={[styles.inputContainer, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                                        <Icon name="phone" size={20} color={colors.textMuted} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.textPrimary }]}
                                            value={mobile}
                                            onChangeText={setMobile}
                                            placeholder="Enter mobile number"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="phone-pad"
                                            maxLength={12}
                                        />
                                    </View>
                                </View>
                            </FadeIn>

                            {/* Vehicle No Field */}
                            <FadeIn delay={500}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Vehicle Number (Optional)</Text>
                                    <View style={[styles.inputContainer, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                                        <Icon name="car" size={20} color={colors.textMuted} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.textPrimary }]}
                                            value={vehicleNo}
                                            onChangeText={setVehicleNo}
                                            placeholder="Enter vehicle number"
                                            placeholderTextColor={colors.textMuted}
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                </View>
                            </FadeIn>

                            {/* Check-in Time */}
                            <FadeIn delay={600}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Check-in Time</Text>
                                    <View style={[styles.inputContainer, styles.readOnly, { backgroundColor: colors.primaryLight, borderColor: colors.accent }]}>
                                        <Icon name="clock-outline" size={20} color={colors.accent} style={styles.inputIcon} />
                                        <Text style={[styles.readOnlyText, { color: colors.accent }]}>{formatDateTime(checkinTime)}</Text>
                                    </View>
                                </View>
                            </FadeIn>

                            {/* Register Button */}
                            <SlideUp delay={700}>
                                <TouchableOpacity
                                    style={[styles.registerButton, { backgroundColor: colors.brand }, isLoading && styles.buttonDisabled]}
                                    onPress={handleRegister}
                                    disabled={isLoading}
                                    activeOpacity={0.8}
                                >
                                    <Icon name={isLoading ? 'loading' : 'account-check'} size={22} color="#FFFFFF" />
                                    <Text style={styles.registerText}>
                                        {isLoading ? 'Registering...' : 'Register Customer'}
                                    </Text>
                                </TouchableOpacity>
                            </SlideUp>
                        </View>
                    </ScaleIn>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 8,
    },
    backText: {
        fontSize: 16,
        marginLeft: 8,
    },
    form: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    required: {
        color: '#F44336',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        minHeight: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 14,
    },
    readOnly: {},
    readOnlyText: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 14,
    },
    registerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    registerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
});

export default NewCustomerScreen;
