import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeScreen from '../screens/HomeScreen';
import NewCustomerScreen from '../screens/NewCustomerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GamesScreen from '../screens/GamesScreen';
import RestaurantScreen from '../screens/RestaurantScreen';
import BakeryScreen from '../screens/BakeryScreen';
import JuiceBarScreen from '../screens/JuiceBarScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Tab configuration
const tabs = [
    { name: 'Home', icon: 'home', iconOutline: 'home-outline', label: 'Home' },
    { name: 'NewCustomer', icon: 'account-plus', iconOutline: 'account-plus-outline', label: 'New' },
    { name: 'Settings', icon: 'cog', iconOutline: 'cog-outline', label: 'Settings' },
];

// Beautiful Custom Tab Bar
const CustomTabBar = ({ state, navigation }) => {
    const { colors, isDarkMode } = useTheme();

    return (
        <View style={[styles.tabBarWrapper, { backgroundColor: colors.background }]}>
            {/* Curved top effect */}
            <View style={[styles.curveTop, { backgroundColor: isDarkMode ? colors.navBg : colors.brand }]} />

            <View style={[styles.tabBarContainer, { backgroundColor: isDarkMode ? colors.navBg : colors.brand }]}>
                <View style={styles.tabBar}>
                    {state.routes.map((route, index) => {
                        const isFocused = state.index === index;
                        const tab = tabs.find((t) => t.name === route.name);

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        return (
                            <TouchableOpacity
                                key={route.key}
                                onPress={onPress}
                                activeOpacity={0.7}
                                style={styles.tabItem}
                            >
                                {isFocused && (
                                    <View style={[styles.activeIndicator, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} />
                                )}
                                <View style={[styles.iconWrapper, isFocused && styles.iconWrapperActive]}>
                                    <Icon
                                        name={isFocused ? tab.icon : tab.iconOutline}
                                        size={isTablet ? 26 : 22}
                                        color={isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        { color: isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)' },
                                        isFocused && styles.tabLabelActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const HomeTabs = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="NewCustomer" component={NewCustomerScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

const AppNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeTabs" component={HomeTabs} />
            <Stack.Screen name="Games" component={GamesScreen} />
            <Stack.Screen name="Restaurant" component={RestaurantScreen} />
            <Stack.Screen name="Bakery" component={BakeryScreen} />
            <Stack.Screen name="JuiceBar" component={JuiceBarScreen} />
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    curveTop: {
        height: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginHorizontal: 0,
    },
    tabBarContainer: {
        paddingBottom: 32, // Extra padding for 3-button navigation
        paddingTop: 4,
    },
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: isTablet ? 56 : 50,
        paddingHorizontal: 16,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        top: 0,
        left: '15%',
        right: '15%',
        bottom: 0,
        borderRadius: 16,
    },
    iconWrapper: {
        marginBottom: 4,
    },
    iconWrapperActive: {
        transform: [{ scale: 1.1 }],
    },
    tabLabel: {
        fontSize: isTablet ? 12 : 11,
        fontWeight: '500',
    },
    tabLabelActive: {
        fontWeight: '600',
    },
});

export default AppNavigator;
