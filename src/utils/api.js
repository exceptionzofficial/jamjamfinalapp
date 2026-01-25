// API Configuration for Jam Jam Resort Employee App
// Live data for multi-employee usage - no caching

import AsyncStorage from '@react-native-async-storage/async-storage';

// For Android Emulator, use 10.0.2.2 instead of localhost
// For Physical Device, use your computer's IP address
// const API_BASE_URL = 'http://10.0.2.2:3000/api';

// Production URL
// const API_BASE_URL = 'https://jamjambackendsettlo.vercel.app/api';
const API_BASE_URL = 'https://642786f8dfbb.ngrok-free.app/api';

// ============= UPI Payment Configuration =============
// Change this to your UPI ID - used across all payment screens
export const UPI_ID = '9361016097@naviaxis';
export const UPI_NAME = 'JamJam Resort';

// Generate UPI payment string for QR code
export const getUPIString = (amount) => {
    return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR`;
};

// Helper function for API calls with timeout
const apiCall = async (endpoint, options = {}) => {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        };

        // Add timeout of 10 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { ...config, signal: controller.signal });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error.message);
        throw error;
    }
};

// ============= CUSTOMER API (LIVE) =============

export const createCustomer = async (customer) => {
    return await apiCall('/customers', {
        method: 'POST',
        body: JSON.stringify(customer),
    });
};

// Get all customers from cloud (LIVE)
export const getCustomers = async () => {
    return await apiCall('/customers');
};

// Get recent customers from cloud (last 10)
export const getRecentCustomers = async () => {
    try {
        const customers = await apiCall('/customers');
        // Sort by checkinTime descending and take top 10
        return customers
            .sort((a, b) => new Date(b.checkinTime) - new Date(a.checkinTime))
            .slice(0, 10);
    } catch (error) {
        console.error('Error fetching recent customers:', error);
        return [];
    }
};

export const searchCustomers = async (query) => {
    if (!query.trim()) return [];
    return await apiCall(`/customers/search?q=${encodeURIComponent(query)}`);
};

export const getCustomerById = async (customerId) => {
    return await apiCall(`/customers/${customerId}`);
};

export const updateCustomer = async (customerId, updates) => {
    return await apiCall(`/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const checkoutCustomer = async (customerId) => {
    return await apiCall(`/customers/${customerId}/checkout`, {
        method: 'POST',
    });
};

export const deleteCustomer = async (customerId) => {
    return await apiCall(`/customers/${customerId}`, {
        method: 'DELETE',
    });
};

// ============= GAMES API (LIVE - NO CACHE) =============

// Get games directly from cloud (LIVE)
export const getGames = async () => {
    try {
        const games = await apiCall('/games');
        // Map gameId to id for compatibility
        return games.map(game => ({
            ...game,
            id: game.gameId,
        }));
    } catch (error) {
        console.error('Error fetching games:', error);
        return [];
    }
};

export const addGame = async (game) => {
    const newGame = await apiCall('/games', {
        method: 'POST',
        body: JSON.stringify(game),
    });
    return { ...newGame, id: newGame.gameId };
};

export const updateGame = async (gameId, updates) => {
    const updated = await apiCall(`/games/${gameId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    return { ...updated, id: updated.gameId };
};

export const deleteGame = async (gameId) => {
    return await apiCall(`/games/${gameId}`, {
        method: 'DELETE',
    });
};

// ============= BOOKINGS API (LIVE) =============

export const saveBooking = async (booking) => {
    return await apiCall('/bookings', {
        method: 'POST',
        body: JSON.stringify(booking),
    });
};

export const getAllBookings = async () => {
    return await apiCall('/bookings');
};

export const getCustomerBookings = async (customerId) => {
    if (!customerId) return [];
    return await apiCall(`/bookings/customer/${customerId}`);
};

export const getBookingById = async (bookingId) => {
    return await apiCall(`/bookings/${bookingId}`);
};

// ============= UTILITY FUNCTIONS =============

// Format date for display
export const formatDateTime = (isoString) => {
    if (!isoString) return '';
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

// Generate unique ID
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
};

// Generate customer ID format
export const generateCustomerId = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `JJ-${timestamp}-${randomPart}`.toUpperCase();
};

// ============= SAVE CUSTOMER (wrapper) =============

export const saveCustomer = async (customer) => {
    const newCustomer = await createCustomer(customer);
    return newCustomer;
};

// ============= ADD TO RECENT (No-op for live mode) =============
// Kept for compatibility but does nothing since we fetch live

export const addToRecent = async (customer) => {
    // No-op - customers are fetched live from cloud
    return;
};

// ============= CLEAR ALL DATA =============

export const clearAllData = async () => {
    console.log('Data is live from cloud - nothing to clear locally');
};

// ============= MENU ITEMS API (LIVE) =============

export const getMenuItems = async () => {
    try {
        const items = await apiCall('/menu');
        return items.map(item => ({
            ...item,
            id: item.itemId,
        }));
    } catch (error) {
        console.error('Error fetching menu items:', error);
        return [];
    }
};

export const addMenuItem = async (item) => {
    const newItem = await apiCall('/menu', {
        method: 'POST',
        body: JSON.stringify(item),
    });
    return { ...newItem, id: newItem.itemId };
};

export const updateMenuItem = async (itemId, updates) => {
    const updated = await apiCall(`/menu/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    return { ...updated, id: updated.itemId };
};

export const deleteMenuItem = async (itemId) => {
    return await apiCall(`/menu/${itemId}`, {
        method: 'DELETE',
    });
};

// ============= COMBOS API (LIVE) =============

export const getCombos = async () => {
    try {
        const combos = await apiCall('/combos');
        return combos.map(combo => ({
            ...combo,
            id: combo.comboId,
        }));
    } catch (error) {
        console.error('Error fetching combos:', error);
        return [];
    }
};

export const addCombo = async (combo) => {
    const newCombo = await apiCall('/combos', {
        method: 'POST',
        body: JSON.stringify(combo),
    });
    return { ...newCombo, id: newCombo.comboId };
};

export const updateCombo = async (comboId, updates) => {
    const updated = await apiCall(`/combos/${comboId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    return { ...updated, id: updated.comboId };
};

export const deleteCombo = async (comboId) => {
    return await apiCall(`/combos/${comboId}`, {
        method: 'DELETE',
    });
};

// ============= RESTAURANT ORDERS API (LIVE) =============

export const saveRestaurantOrder = async (order) => {
    return await apiCall('/restaurant-orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
};

export const getRestaurantOrders = async () => {
    return await apiCall('/restaurant-orders');
};

export const getCustomerRestaurantOrders = async (customerId) => {
    if (!customerId) return [];
    return await apiCall(`/restaurant-orders/customer/${customerId}`);
};

export const updateRestaurantOrderStatus = async (orderId, status) => {
    return await apiCall(`/restaurant-orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
};

// ============= BAKERY ITEMS API (LIVE) =============

export const getBakeryItems = async () => {
    const items = await apiCall('/bakery-items');
    return items.map(item => ({
        ...item,
        id: item.itemId || item.id,
    }));
};

export const addBakeryItem = async (item) => {
    return await apiCall('/bakery-items', {
        method: 'POST',
        body: JSON.stringify(item),
    });
};

export const updateBakeryItem = async (itemId, updates) => {
    return await apiCall(`/bakery-items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteBakeryItem = async (itemId) => {
    return await apiCall(`/bakery-items/${itemId}`, {
        method: 'DELETE',
    });
};

// ============= BAKERY ORDERS API (LIVE) =============

export const saveBakeryOrder = async (order) => {
    return await apiCall('/bakery-orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
};

export const getCustomerBakeryOrders = async (customerId) => {
    if (!customerId) return [];
    return await apiCall(`/bakery-orders/customer/${customerId}`);
};

// ============= JUICE BAR ITEMS API (LIVE) =============

export const getJuiceItems = async () => {
    const items = await apiCall('/juice-items');
    return items.map(item => ({
        ...item,
        id: item.itemId || item.id,
    }));
};

export const addJuiceItem = async (item) => {
    return await apiCall('/juice-items', {
        method: 'POST',
        body: JSON.stringify(item),
    });
};

export const updateJuiceItem = async (itemId, updates) => {
    return await apiCall(`/juice-items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteJuiceItem = async (itemId) => {
    return await apiCall(`/juice-items/${itemId}`, {
        method: 'DELETE',
    });
};

// ============= JUICE BAR ORDERS API (LIVE) =============

export const saveJuiceOrder = async (order) => {
    return await apiCall('/juice-orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
};

export const getCustomerJuiceOrders = async (customerId) => {
    if (!customerId) return [];
    return await apiCall(`/juice-orders/customer/${customerId}`);
};

// ============= MASSAGE ITEMS API (LIVE) =============

export const getMassageItems = async () => {
    const items = await apiCall('/massage-items');
    return items.map(item => ({
        ...item,
        id: item.itemId || item.id,
    }));
};

export const addMassageItem = async (item) => {
    return await apiCall('/massage-items', {
        method: 'POST',
        body: JSON.stringify(item),
    });
};

export const updateMassageItem = async (itemId, updates) => {
    return await apiCall(`/massage-items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteMassageItem = async (itemId) => {
    return await apiCall(`/massage-items/${itemId}`, {
        method: 'DELETE',
    });
};

// ============= MASSAGE ORDERS API (LIVE) =============

export const saveMassageOrder = async (order) => {
    return await apiCall('/massage-orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
};

export const getCustomerMassageOrders = async (customerId) => {
    if (!customerId) return [];
    return await apiCall(`/massage-orders/customer/${customerId}`);
};

// ============= POOL TYPES API (LIVE) =============

export const getPoolTypes = async () => {
    const types = await apiCall('/pool-types');
    return types.map(type => ({
        ...type,
        id: type.typeId || type.id,
    }));
};

export const addPoolType = async (type) => {
    return await apiCall('/pool-types', {
        method: 'POST',
        body: JSON.stringify(type),
    });
};

export const updatePoolType = async (typeId, updates) => {
    return await apiCall(`/pool-types/${typeId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deletePoolType = async (typeId) => {
    return await apiCall(`/pool-types/${typeId}`, {
        method: 'DELETE',
    });
};

// ============= POOL ORDERS API (LIVE) =============

export const savePoolOrder = async (order) => {
    return await apiCall('/pool-orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
};

export const getCustomerPoolOrders = async (customerId) => {
    if (!customerId) return [];
    return await apiCall(`/pool-orders/customer/${customerId}`);
};
