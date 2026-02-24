import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    Image,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useWindowDimensions } from 'react-native';

// Safe Dimensions access with fallback
let screenWidth = 375; // Default iPhone width
try {
    screenWidth = Dimensions.get('window').width;
} catch (error) {
    console.warn('Dimensions not available during BannerCarousel initialization');
}
const BANNER_HEIGHT = 160;

// Placeholder banner images (online images for now)
const DEFAULT_BANNERS = [
    {
        id: '1',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
        title: 'Welcome to Sri Kalki Jam Jam Resorts',
    },
    {
        id: '2',
        image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
        title: 'Special Combo Offers',
    },
    {
        id: '3',
        image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&q=80',
        title: 'Games & Entertainment',
    },
    {
        id: '4',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
        title: 'Fine Dining Experience',
    },
];

const BannerCarousel = ({ banners = DEFAULT_BANNERS, onBannerPress }) => {
    const { width: currentWidth } = useWindowDimensions();
    const { colors } = useTheme();
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const bannerWidth = currentWidth - 32;

    // Auto-scroll
    useEffect(() => {
        const interval = setInterval(() => {
            const nextIndex = (activeIndex + 1) % banners.length;
            scrollRef.current?.scrollTo({
                x: nextIndex * (bannerWidth + 12),
                animated: true,
            });
            setActiveIndex(nextIndex);
        }, 4000);

        return () => clearInterval(interval);
    }, [activeIndex, banners.length, bannerWidth]);

    const handleScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / (bannerWidth + 12));
        setActiveIndex(index);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
                snapToInterval={bannerWidth + 12}
            >
                {banners.map((banner, index) => (
                    <TouchableOpacity
                        key={banner.id}
                        activeOpacity={0.9}
                        onPress={() => onBannerPress?.(banner)}
                        style={[styles.bannerCard, { width: bannerWidth }]}
                    >
                        <Image
                            source={{ uri: banner.image }}
                            style={styles.bannerImage}
                            resizeMode="cover"
                        />
                        <View style={styles.overlay} />
                        <View style={styles.bannerContent}>
                            <Text style={styles.bannerTitle}>{banner.title}</Text>
                            {banner.subtitle && (
                                <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
                {banners.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            {
                                backgroundColor: index === activeIndex ? colors.accent : colors.border,
                                width: index === activeIndex ? 20 : 8,
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    bannerCard: {
        height: BANNER_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: '#1a1a2e',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    bannerContent: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 16,
    },
    bannerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    bannerSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
});

export default BannerCarousel;
