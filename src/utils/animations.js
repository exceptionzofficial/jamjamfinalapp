import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Fade In animation wrapper
export const FadeIn = ({ children, delay = 0, duration = 400, style }) => {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }).start();
    }, [opacity, delay, duration]);

    return (
        <Animated.View style={[{ opacity }, style]}>
            {children}
        </Animated.View>
    );
};

// Slide Up animation wrapper
export const SlideUp = ({ children, delay = 0, duration = 500, distance = 30, style }) => {
    const translateY = useRef(new Animated.Value(distance)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(1.2)),
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: duration * 0.8,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [translateY, opacity, delay, duration, distance]);

    return (
        <Animated.View style={[{ transform: [{ translateY }], opacity }, style]}>
            {children}
        </Animated.View>
    );
};

// Slide In from Right animation wrapper
export const SlideInRight = ({ children, delay = 0, duration = 400, distance = 50, style }) => {
    const translateX = useRef(new Animated.Value(distance)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(translateX, {
                toValue: 0,
                duration,
                delay,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: duration * 0.8,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [translateX, opacity, delay, duration, distance]);

    return (
        <Animated.View style={[{ transform: [{ translateX }], opacity }, style]}>
            {children}
        </Animated.View>
    );
};

// Scale In animation wrapper
export const ScaleIn = ({ children, delay = 0, duration = 400, style }) => {
    const scale = useRef(new Animated.Value(0.8)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                delay,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [scale, opacity, delay, duration]);

    return (
        <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
            {children}
        </Animated.View>
    );
};

// Staggered list item animation
export const StaggerItem = ({ children, index, delay = 50, style }) => {
    const translateY = useRef(new Animated.Value(20)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const staggerDelay = index * delay;

        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay: staggerDelay,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                delay: staggerDelay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [translateY, opacity, index, delay]);

    return (
        <Animated.View style={[{ transform: [{ translateY }], opacity }, style]}>
            {children}
        </Animated.View>
    );
};

// Bounce animation for buttons
export const useBounceAnimation = () => {
    const scale = useRef(new Animated.Value(1)).current;

    const bounce = () => {
        Animated.sequence([
            Animated.timing(scale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 300,
                friction: 10,
            }),
        ]).start();
    };

    return { scale, bounce };
};

export default {
    FadeIn,
    SlideUp,
    SlideInRight,
    ScaleIn,
    StaggerItem,
    useBounceAnimation,
};
