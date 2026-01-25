import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../context/ThemeContext';

const Header = ({ title, subtitle, showTypewriter = false }) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    // Title typewriter
    const [displayTitle, setDisplayTitle] = useState('');
    const fullTitle = title || 'Sri Kalki Jam Jam Resorts';

    // Subtitle typewriter
    const [displaySubtitle, setDisplaySubtitle] = useState('');
    const fullSubtitle = subtitle || '';

    const cursorOpacity = useRef(new Animated.Value(1)).current;
    const logoScale = useRef(new Animated.Value(0)).current;
    const headerSlide = useRef(new Animated.Value(-20)).current;
    const headerOpacity = useRef(new Animated.Value(0)).current;

    // Logo entrance animation
    useEffect(() => {
        Animated.spring(logoScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
            delay: 100,
        }).start();

        Animated.parallel([
            Animated.timing(headerSlide, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(headerOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, [logoScale, headerSlide, headerOpacity]);

    // Infinite typewriter effect
    useEffect(() => {
        if (!showTypewriter) {
            setDisplayTitle(fullTitle);
            setDisplaySubtitle(fullSubtitle);
            return;
        }

        let titleIndex = 0;
        let subtitleIndex = 0;
        let phase = 'typing-title'; // phases: typing-title, typing-subtitle, pause, clearing
        let pauseCount = 0;
        const PAUSE_DURATION = 30; // ~1.5 seconds at 50ms interval

        const animationInterval = setInterval(() => {
            switch (phase) {
                case 'typing-title':
                    if (titleIndex <= fullTitle.length) {
                        setDisplayTitle(fullTitle.substring(0, titleIndex));
                        titleIndex++;
                    } else {
                        phase = 'typing-subtitle';
                    }
                    break;

                case 'typing-subtitle':
                    if (subtitleIndex <= fullSubtitle.length) {
                        setDisplaySubtitle(fullSubtitle.substring(0, subtitleIndex));
                        subtitleIndex++;
                    } else {
                        phase = 'pause';
                        pauseCount = 0;
                    }
                    break;

                case 'pause':
                    pauseCount++;
                    if (pauseCount >= PAUSE_DURATION) {
                        phase = 'clearing';
                    }
                    break;

                case 'clearing':
                    if (subtitleIndex > 0) {
                        subtitleIndex--;
                        setDisplaySubtitle(fullSubtitle.substring(0, subtitleIndex));
                    } else if (titleIndex > 0) {
                        titleIndex--;
                        setDisplayTitle(fullTitle.substring(0, titleIndex));
                    } else {
                        phase = 'typing-title';
                    }
                    break;
            }
        }, 50);

        return () => clearInterval(animationInterval);
    }, [fullTitle, fullSubtitle, showTypewriter]);

    // Cursor blink animation
    useEffect(() => {
        if (!showTypewriter) return;

        const blink = Animated.loop(
            Animated.sequence([
                Animated.timing(cursorOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(cursorOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ])
        );
        blink.start();

        return () => blink.stop();
    }, [cursorOpacity, showTypewriter]);

    const showTitleCursor = showTypewriter && displayTitle.length < fullTitle.length && displaySubtitle.length === 0;
    const showSubtitleCursor = showTypewriter && displayTitle.length > 0;

    return (
        <View style={styles.wrapper}>
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.brand }]}>
                <Animated.View
                    style={[
                        styles.content,
                        {
                            transform: [{ translateY: headerSlide }],
                            opacity: headerOpacity,
                        },
                    ]}
                >
                    <View style={styles.logoRow}>
                        <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
                            <Icon name="palm-tree" size={28} color={colors.accent} />
                        </Animated.View>
                        <View style={styles.titleContainer}>
                            <View style={styles.typewriterRow}>
                                <Text style={styles.title}>{displayTitle}</Text>
                                {showTitleCursor && (
                                    <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>|</Animated.Text>
                                )}
                            </View>
                            {(subtitle || showTypewriter) && (
                                <View style={styles.typewriterRow}>
                                    <Text style={styles.subtitle}>{displaySubtitle}</Text>
                                    {showSubtitleCursor && (
                                        <Animated.Text style={[styles.subtitleCursor, { opacity: cursorOpacity }]}>|</Animated.Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </Animated.View>
            </View>
            <View style={[styles.curvedBottom, { backgroundColor: colors.background }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        zIndex: 10,
    },
    container: {
        paddingBottom: 20,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    titleContainer: {
        flex: 1,
    },
    typewriterRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    cursor: {
        fontSize: 18,
        fontWeight: '300',
        color: '#FFFFFF',
        marginLeft: 2,
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
        fontWeight: '500',
    },
    subtitleCursor: {
        fontSize: 13,
        fontWeight: '300',
        color: 'rgba(255, 255, 255, 0.8)',
        marginLeft: 1,
    },
    curvedBottom: {
        height: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -10,
    },
});

export default Header;
