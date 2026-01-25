import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOMERS_KEY = '@jamjam_customers';
const RECENT_KEY = '@jamjam_recent';
const GAMES_KEY = '@jamjam_games';

// Default games list from screenshot with Coin, Minutes, Rate
const DEFAULT_GAMES = [
    { id: '1', name: 'Car Dancing', coins: 1, minutes: 3, rate: 30 },
    { id: '2', name: 'Horse Riding', coins: 1, minutes: 3, rate: 30 },
    { id: '3', name: 'Elephant Riding', coins: 1, minutes: 3, rate: 30 },
    { id: '4', name: 'Frog Hitter', coins: 1, minutes: 3, rate: 30 },
    { id: '5', name: 'Ball Shooter', coins: 1, minutes: 3, rate: 30 },
    { id: '6', name: 'Car Racing', coins: 2, minutes: 3, rate: 60 },
    { id: '7', name: 'Dancing Roll', coins: 1, minutes: 3, rate: 30 },
    { id: '8', name: 'Bike Racing', coins: 2, minutes: 3, rate: 60 },
    { id: '9', name: 'Basket Ball', coins: 1, minutes: 1.5, rate: 30 },
    { id: '10', name: 'Gun Shooter', coins: 2, minutes: 3, rate: 40 },
    { id: '11', name: 'Bull Rider (18+)', coins: 'Ticket', minutes: 5, rate: 50 },
    { id: '12', name: 'Table Striker', coins: '-', minutes: 3, rate: 100 },
    { id: '13', name: 'VR Game (18+)', coins: '-', minutes: 15, rate: 100 },
    { id: '14', name: 'PS-4', coins: '-', minutes: 30, rate: 200 },
];

// Generate unique customer ID
export const generateCustomerId = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `JJ-${timestamp}-${randomPart}`.toUpperCase();
};

// Generate unique ID
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

// Get all customers
export const getCustomers = async () => {
    try {
        const data = await AsyncStorage.getItem(CUSTOMERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting customers:', error);
        return [];
    }
};

// Save a new customer
export const saveCustomer = async (customer) => {
    try {
        const customers = await getCustomers();
        const newCustomer = {
            ...customer,
            id: generateCustomerId(),
            checkinTime: new Date().toISOString(),
        };
        customers.unshift(newCustomer);
        await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
        await addToRecent(newCustomer);
        return newCustomer;
    } catch (error) {
        console.error('Error saving customer:', error);
        throw error;
    }
};

// Search customers by name or mobile
export const searchCustomers = async (query) => {
    try {
        const customers = await getCustomers();
        if (!query.trim()) return customers;

        const lowerQuery = query.toLowerCase();
        return customers.filter(
            (c) =>
                c.name.toLowerCase().includes(lowerQuery) ||
                c.mobile.includes(query)
        );
    } catch (error) {
        console.error('Error searching customers:', error);
        return [];
    }
};

// Get recent customers (last 10)
export const getRecentCustomers = async () => {
    try {
        const data = await AsyncStorage.getItem(RECENT_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting recent customers:', error);
        return [];
    }
};

// Add to recent customers
export const addToRecent = async (customer) => {
    try {
        let recent = await getRecentCustomers();
        recent = recent.filter((c) => c.id !== customer.id);
        recent.unshift(customer);
        recent = recent.slice(0, 10);
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (error) {
        console.error('Error adding to recent:', error);
    }
};

// Clear all data
export const clearAllData = async () => {
    try {
        await AsyncStorage.multiRemove([CUSTOMERS_KEY, RECENT_KEY]);
    } catch (error) {
        console.error('Error clearing data:', error);
    }
};

// Format date for display
export const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

// ============= GAMES =============

// Get all games
export const getGames = async () => {
    try {
        const data = await AsyncStorage.getItem(GAMES_KEY);
        if (data) {
            return JSON.parse(data);
        }
        await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(DEFAULT_GAMES));
        return DEFAULT_GAMES;
    } catch (error) {
        console.error('Error getting games:', error);
        return DEFAULT_GAMES;
    }
};

// Add a new game
export const addGame = async (game) => {
    try {
        const games = await getGames();
        const newGame = {
            ...game,
            id: generateId(),
        };
        games.push(newGame);
        await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(games));
        return newGame;
    } catch (error) {
        console.error('Error adding game:', error);
        throw error;
    }
};

// Update a game
export const updateGame = async (gameId, updates) => {
    try {
        const games = await getGames();
        const index = games.findIndex((g) => g.id === gameId);
        if (index !== -1) {
            games[index] = { ...games[index], ...updates };
            await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(games));
            return games[index];
        }
        throw new Error('Game not found');
    } catch (error) {
        console.error('Error updating game:', error);
        throw error;
    }
};

// Delete a game
export const deleteGame = async (gameId) => {
    try {
        const games = await getGames();
        const filtered = games.filter((g) => g.id !== gameId);
        await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error deleting game:', error);
        throw error;
    }
};

// ============= BOOKING HISTORY =============

const BOOKINGS_KEY = '@jamjam_bookings';

// Save a booking
export const saveBooking = async (booking) => {
    try {
        const data = await AsyncStorage.getItem(BOOKINGS_KEY);
        const bookings = data ? JSON.parse(data) : [];
        const newBooking = {
            ...booking,
            id: generateId(),
            timestamp: new Date().toISOString(),
        };
        bookings.unshift(newBooking);
        await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
        return newBooking;
    } catch (error) {
        console.error('Error saving booking:', error);
        throw error;
    }
};

// Get all bookings for a customer
export const getCustomerBookings = async (customerId) => {
    try {
        const data = await AsyncStorage.getItem(BOOKINGS_KEY);
        const bookings = data ? JSON.parse(data) : [];
        return bookings.filter((b) => b.customerId === customerId);
    } catch (error) {
        console.error('Error getting customer bookings:', error);
        return [];
    }
};

// Get all bookings
export const getAllBookings = async () => {
    try {
        const data = await AsyncStorage.getItem(BOOKINGS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting all bookings:', error);
        return [];
    }
};

