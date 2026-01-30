import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.7));
    const [textFade] = useState(new Animated.Value(0));

    useEffect(() => {
        // Logo animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 50,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Text fade in after logo
            Animated.timing(textFade, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        });

        // Auto proceed after 2.5 seconds
        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => onFinish && onFinish());
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* Background gradient effect */}
            <View style={styles.gradientTop} />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {/* Logo Container */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* Brand Text */}
                <Animated.View style={{ opacity: textFade }}>
                    <Text style={styles.title}>Sri Kalki Jam Jam</Text>
                    <Text style={styles.subtitle}>Resorts & Theme Park</Text>
                    <View style={styles.divider} />
                    <Text style={styles.tagline}>Employee Portal</Text>
                </Animated.View>
            </Animated.View>

            {/* Version */}
            <Text style={styles.version}>v1.0.0</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A1A2E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.4,
        backgroundColor: '#16213E',
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
    },
    content: {
        alignItems: 'center',
    },
    logoContainer: {
        width: 160,
        height: 160,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#0F3460',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 25,
        elevation: 15,
    },
    logo: {
        width: 120,
        height: 120,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: '#E94560',
        textAlign: 'center',
        marginTop: 4,
        fontWeight: '600',
    },
    divider: {
        width: 60,
        height: 3,
        backgroundColor: '#E94560',
        borderRadius: 2,
        marginVertical: 20,
        alignSelf: 'center',
    },
    tagline: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
    version: {
        position: 'absolute',
        bottom: 40,
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
    },
});

export default SplashScreen;
