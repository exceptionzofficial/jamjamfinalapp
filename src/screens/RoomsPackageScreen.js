import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { SlideUp, FadeIn } from '../utils/animations';
import * as api from '../utils/api';

// Safe Dimensions access with fallback
let isTablet = false;
let screenWidth = 375;
try {
    const dimWidth = Dimensions.get('window').width;
    isTablet = dimWidth >= 768;
    screenWidth = dimWidth;
} catch (error) {
    console.warn('Dimensions not available during RoomsPackageScreen initialization');
}

// Lottie animation
const RoomLoadingAnimation = require('../assets/room.json');

const FACILITIES = [
    { name: 'FREE BREAKFAST', icon: 'food-croissant' },
    { name: 'FREE PARKING', icon: 'parking' },
    { name: 'LIVING AREA', icon: 'sofa' },
    { name: 'FREE WIFI', icon: 'wifi' },
    { name: 'RESTAURANTS', icon: 'silverware-fork-knife' },
    { name: '24HRS SAFETY & SECURITY', icon: 'camera-account' },
];

const RoomsPackageScreen = ({ navigation, route }) => {
    const { colors } = useTheme();
    const customer = route?.params?.customer;

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedSubImages, setSelectedSubImages] = useState([null, null, null]);
    const [form, setForm] = useState({
        name: '',
        tamilName: '',
        price: '',
        size: '',
        ac: true,
        imageUrl: '',
        descriptions: [],
        subImages: [],
        roomNumbers: [],
    });

    const [newRoomNumber, setNewRoomNumber] = useState('');

    // Booking states
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [selectedRoomNumber, setSelectedRoomNumber] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingType, setBookingType] = useState('daily');
    const [duration, setDuration] = useState('1');
    const [guestCount, setGuestCount] = useState('2');

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async (showLoading = true) => {
        const startTime = Date.now();
        if (showLoading) setLoading(true);

        try {
            const data = await api.getRooms();
            setRooms(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch rooms');
        } finally {
            // Ensure minimum 5 seconds loading animation if it's the initial load
            const elapsed = Date.now() - startTime;
            const minLoadTime = showLoading ? 5000 : 0;
            const remainingTime = Math.max(0, minLoadTime - elapsed);

            setTimeout(() => {
                setLoading(false);
            }, remainingTime);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.tamilName || !form.price) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            let imageUrl = form.imageUrl;

            // Handle Image Upload if a new image was selected
            if (selectedImage) {
                console.log('📤 Uploading main image via backend...');
                const fileName = selectedImage.fileName || `room_image_${Date.now()}.jpg`;
                const fileType = selectedImage.type || 'image/jpeg';

                const { publicUrl } = await api.uploadRoomImage(selectedImage.base64, fileName, fileType);
                imageUrl = publicUrl;
                console.log('✅ Main image uploaded successfully');
            }

            // Handle Sub-Images Upload (Max 3 slots)
            const finalSubImages = [...(form.subImages || [])];
            while (finalSubImages.length < 3) finalSubImages.push(null);

            for (let i = 0; i < 3; i++) {
                if (selectedSubImages[i]) {
                    console.log(`📤 Uploading sub-image slot ${i + 1}...`);
                    const fileName = selectedSubImages[i].fileName || `sub_image_${i}_${Date.now()}.jpg`;
                    const fileType = selectedSubImages[i].type || 'image/jpeg';

                    const { publicUrl } = await api.uploadRoomImage(selectedSubImages[i].base64, fileName, fileType);
                    finalSubImages[i] = publicUrl;
                    console.log(`✅ Sub-image ${i + 1} uploaded`);
                }
            }

            const roomData = {
                ...form,
                price: parseFloat(form.price),
                imageUrl: imageUrl,
                subImages: finalSubImages.filter(url => url !== null && url !== ''),
                facilities: ['FREE BREAKFAST', 'FREE PARKING', 'LIVING AREA', 'FREE WIFI', 'RESTAURANTS', '24HRS SAFETY & SECURITY'],
            };

            console.log('💾 Saving room data to backend...');
            if (editingRoom) {
                await api.updateRoom(editingRoom.id, roomData);
                Alert.alert('Success', 'Room updated successfully');
            } else {
                await api.addRoom(roomData);
                Alert.alert('Success', 'Room added successfully');
            }
            console.log('✅ Room saved successfully');
            setModalVisible(false);
            setSelectedImage(null);
            fetchRooms();
        } catch (error) {
            console.error('❌ Error saving room:', error);
            console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            Alert.alert('Error', `Failed to save room: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (roomId) => {
        Alert.alert(
            'Delete Room',
            'Are you sure you want to delete this room package?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await api.deleteRoom(roomId);
                            Alert.alert('Success', 'Room deleted successfully');
                            fetchRooms();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete room');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const openEditModal = (room = null) => {
        setSelectedImage(null);
        setSelectedSubImages([null, null, null]);
        if (room) {
            setEditingRoom(room);
            setForm({
                name: room.name,
                tamilName: room.tamilName,
                price: room.price.toString(),
                size: room.size,
                ac: room.ac ?? true,
                imageUrl: room.imageUrl || '',
                descriptions: room.descriptions || [],
                subImages: room.subImages || [],
                roomNumbers: room.roomNumbers || [],
            });
        } else {
            setEditingRoom(null);
            setForm({
                name: '',
                tamilName: '',
                price: '',
                size: '',
                ac: true,
                imageUrl: '',
                descriptions: [],
                subImages: [],
                roomNumbers: [],
            });
        }
        setNewRoomNumber('');
        setModalVisible(true);
    };

    const pickImage = (isSubImage = false, index = 0) => {
        const isSub = isSubImage === true;
        launchImageLibrary({ mediaType: 'photo', quality: 0.6, includeBase64: true }, (response) => {
            if (response.didCancel) return;
            if (response.errorCode) {
                Alert.alert('Error', 'Image selection failed');
                return;
            }
            if (response.assets && response.assets.length > 0) {
                if (isSub) {
                    const newSelectedSubImages = [...selectedSubImages];
                    newSelectedSubImages[index] = response.assets[0];
                    setSelectedSubImages(newSelectedSubImages);
                } else {
                    setSelectedImage(response.assets[0]);
                }
            }
        });
    };

    const addDescription = () => {
        setForm({
            ...form,
            descriptions: [...form.descriptions, ''],
        });
    };

    const updateDescription = (text, index) => {
        const newDescriptions = [...form.descriptions];
        newDescriptions[index] = text;
        setForm({ ...form, descriptions: newDescriptions });
    };

    const removeDescription = (index) => {
        const newDescriptions = form.descriptions.filter((_, i) => i !== index);
        setForm({ ...form, descriptions: newDescriptions });
    };

    const addRoomNumber = () => {
        if (!newRoomNumber.trim()) return;
        if (form.roomNumbers.includes(newRoomNumber.trim())) {
            Alert.alert('Duplicate', 'This room number already exists');
            return;
        }
        setForm({
            ...form,
            roomNumbers: [...form.roomNumbers, newRoomNumber.trim()],
        });
        setNewRoomNumber('');
    };

    const removeRoomNumber = (num) => {
        setForm({
            ...form,
            roomNumbers: form.roomNumbers.filter(n => n !== num),
        });
    };

    const handleSelectRoom = (room) => {
        setSelectedRoom(room);
        setSelectedRoomNumber(room.roomNumbers?.[0] || null);
        setShowBookingModal(true);
    };

    const calculateTotal = () => {
        if (!selectedRoom) return 0;
        const durationNum = parseInt(duration) || 1;
        // Current implementation uses room.price as base
        return selectedRoom.price * durationNum;
    };

    const renderBookingModal = () => (
        <Modal
            visible={showBookingModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowBookingModal(false)}
        >
            <View style={styles.bookingModalOverlay}>
                <View style={[styles.bookingModalContainer, { backgroundColor: colors.card }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.bookingModalHeader}>
                            <Text style={[styles.bookingModalTitle, { color: colors.textPrimary }]}>Book Room</Text>
                            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                                <Icon name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {selectedRoom && (
                            <View style={[styles.selectedRoomCard, { backgroundColor: colors.background }]}>
                                <View style={[styles.miniRoomIcon, { backgroundColor: colors.brand }]}>
                                    <Icon name={selectedRoom.ac ? 'bed-king' : 'bed'} size={24} color="#FFFFFF" />
                                </View>
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={[styles.selectedRoomName, { color: colors.textPrimary }]}>{selectedRoom.name}</Text>
                                    <Text style={[styles.selectedRoomType, { color: colors.textSecondary }]}>{selectedRoom.ac ? 'AC' : 'Non-AC'} | {selectedRoom.size}</Text>
                                </View>
                            </View>
                        )}

                        <Text style={styles.formSectionLabel}>Select Room Number</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.roomNumbersRow}
                        >
                            {selectedRoom?.roomNumbers?.map((roomNum) => (
                                <TouchableOpacity
                                    key={roomNum}
                                    style={[
                                        styles.roomNumberChip,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                        },
                                        selectedRoomNumber === roomNum && { backgroundColor: '#10B981', borderColor: '#10B981' }
                                    ]}
                                    onPress={() => setSelectedRoomNumber(roomNum)}
                                >
                                    <Text style={[
                                        styles.roomNumberText,
                                        { color: colors.textPrimary },
                                        selectedRoomNumber === roomNum && { color: '#FFFFFF' }
                                    ]}>
                                        {roomNum}
                                    </Text>
                                </TouchableOpacity>
                            )) || <Text style={{ color: colors.textMuted }}>No rooms available</Text>}
                        </ScrollView>

                        <View style={styles.bookingTotalSection}>
                            <Text style={styles.bookingTotalLabel}>ROOM PRICE</Text>
                            <Text style={styles.bookingTotalValue}>₹{selectedRoom?.price?.toLocaleString() || 0}</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.bookingModalActions}>
                        <TouchableOpacity
                            style={[styles.bookingCancelBtn, { borderColor: colors.border }]}
                            onPress={() => setShowBookingModal(false)}
                        >
                            <Text style={styles.bookingCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.bookingConfirmBtn}
                            onPress={() => {
                                if (!selectedRoomNumber) {
                                    Alert.alert('Selection Error', 'Please select a room number');
                                    return;
                                }
                                setShowBookingModal(false);
                                navigation.navigate('RoomCheckout', {
                                    customer,
                                    room: { ...selectedRoom, selectedRoomNumber },
                                    bookingDetails: {
                                        type: bookingType,
                                        duration: parseInt(duration) || 1,
                                        guests: parseInt(guestCount) || 1,
                                        roomNumber: selectedRoomNumber
                                    }
                                });
                            }}
                        >
                            <Icon name="check-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.bookingConfirmText}>GO TO CHECKOUT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderPackageItem = ({ item, index }) => (
        <SlideUp style={styles.cardWrapper} delay={index * 100}>
            <View style={[styles.card, { backgroundColor: '#F9D423' }]}>
                {/* Admin Actions */}
                <View style={styles.adminActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                        <Icon name="pencil" size={20} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { marginLeft: 10 }]} onPress={() => handleDelete(item.id)}>
                        <Icon name="trash-can" size={20} color="#D32F2F" />
                    </TouchableOpacity>
                </View>

                {/* Top Section with Image and Main Info */}
                <View style={styles.topSection}>
                    <View style={styles.imageContainer}>
                        {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.roomImage} />
                        ) : (
                            <View style={styles.placeholderImg}>
                                <Icon name="home-city" size={60} color="#555" />
                            </View>
                        )}
                        <View style={styles.tamilNameOverlay}>
                            <Text style={styles.tamilNameSmall}>{item.tamilName}</Text>
                        </View>
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.roomType}>{item.name}</Text>
                        <Text style={styles.tamilNameBig}>{item.tamilName}</Text>

                        <View style={styles.priceContainer}>
                            <Text style={styles.perDay}>PER DAY</Text>
                            <Text style={styles.currency}>INR ₹ </Text>
                            <Text style={styles.price}>{item.price.toLocaleString()}</Text>
                        </View>
                        <Text style={styles.exclusive}>EXCLUSIVE OF TAXES</Text>

                        <View style={styles.sizeBadge}>
                            <Text style={styles.sizeText}>{item.size}</Text>
                        </View>
                    </View>
                </View>

                {/* Sub-Images Row */}
                <View style={styles.subImagesRow}>
                    {[0, 1, 2].map((idx) => {
                        const subImg = item.subImages && item.subImages[idx];
                        return (
                            <View key={idx} style={styles.subImagePlaceholder}>
                                {subImg ? (
                                    <Image source={{ uri: subImg }} style={styles.roomImage} />
                                ) : (
                                    <View style={styles.placeholderImg}>
                                        <Icon name="image-plus" size={30} color="#BBB" />
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Facility Section */}
                <View style={styles.facilitySection}>
                    <Text style={styles.facilityTitle}>FACILITY</Text>
                    <View style={styles.facilityGrid}>
                        {FACILITIES.map((fac, idx) => (
                            <View key={idx} style={styles.facilityItem}>
                                <View style={styles.facilityIconCircle}>
                                    <Icon name={fac.icon} size={20} color="#000" />
                                </View>
                                <Text style={styles.facilityName}>{fac.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Footer Section */}
                <View style={styles.footerSection}>
                    <View style={styles.footerRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.footerText}>Extra Bed charges RS:1500 <Text style={styles.boldText}>PER-PERSON-ONLY</Text></Text>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.bullet} />
                        <View style={styles.acContainer}>
                            <Text style={styles.footerText}>{item.ac ? 'AC ROOM' : 'NON-AC ROOM'}</Text>
                            <Icon name={item.ac ? "air-conditioner" : "fan"} size={24} color="#000" style={{ marginLeft: 10 }} />
                        </View>
                    </View>

                    <View style={styles.footerRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.footerText}>Cancellation is allowed only 7 days before checkin date</Text>
                    </View>

                    {item.descriptions && item.descriptions.map((desc, idx) => (
                        <View key={idx} style={styles.footerRow}>
                            <View style={styles.bullet} />
                            <Text style={styles.footerText}>{desc}</Text>
                        </View>
                    ))}
                </View>

                {/* Book Button */}
                <TouchableOpacity
                    style={styles.bookButton}
                    activeOpacity={0.8}
                    onPress={() => handleSelectRoom(item)}
                >
                    <Text style={styles.bookButtonText}>BOOK NOW</Text>
                    <Icon name="chevron-right" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </SlideUp>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: '#6D9788' }]}>
                <Header title="Rooms" subtitle="Live Inventory" />
                <View style={styles.loadingContainer}>
                    <LottieView
                        source={RoomLoadingAnimation}
                        autoPlay
                        loop
                        style={styles.lottieAnimation}
                    />
                    <Text style={[styles.loadingText, { color: '#FFFFFF' }]}>
                        Finding the best rooms for you...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Rooms" subtitle="Live Inventory" />

            <View style={styles.navBar}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color={colors.textPrimary} />
                    <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.addBtn} onPress={() => openEditModal()}>
                        <Icon name="plus" size={20} color="#FFF" />
                        <Text style={styles.addBtnText}>ADD ROOM</Text>
                    </TouchableOpacity>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{rooms.length} AVAILABLE</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={rooms}
                keyExtractor={(item) => item.id}
                renderItem={renderPackageItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={loading}
                onRefresh={fetchRooms}
            />

            {/* Add/Edit Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingRoom ? 'Edit Room Package' : 'Add New Room'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Icon name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Room Photo</Text>
                            <View style={styles.imagePickerContainer}>
                                <TouchableOpacity style={styles.pickImgBtn} onPress={() => pickImage(false)}>
                                    {(selectedImage || form.imageUrl) ? (
                                        <Image
                                            source={{ uri: selectedImage ? selectedImage.uri : form.imageUrl }}
                                            style={styles.previewImage}
                                        />
                                    ) : (
                                        <View style={styles.imagePlaceholder}>
                                            <Icon name="camera-plus" size={40} color="#666" />
                                            <Text style={styles.pickImgText}>Select Room Image</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                {(selectedImage || form.imageUrl) && (
                                    <TouchableOpacity
                                        style={styles.removeImgBtn}
                                        onPress={() => {
                                            setSelectedImage(null);
                                            setForm({ ...form, imageUrl: '' });
                                        }}
                                    >
                                        <Icon name="close-circle" size={24} color="#D32F2F" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <Text style={styles.label}>Sub Photos (3 slots)</Text>
                            <View style={styles.subImagesRow}>
                                {[0, 1, 2].map((idx) => {
                                    const selectedSub = selectedSubImages[idx];
                                    const existingSub = form.subImages[idx];
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.subImagePlaceholder}
                                            onPress={() => pickImage(true, idx)}
                                        >
                                            {(selectedSub || existingSub) ? (
                                                <Image
                                                    source={{ uri: selectedSub ? selectedSub.uri : existingSub }}
                                                    style={styles.previewImage}
                                                />
                                            ) : (
                                                <Icon name="camera-plus" size={24} color="#BBB" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.label}>Room Name / Type</Text>
                            <TextInput
                                style={styles.input}
                                value={form.name}
                                onChangeText={(text) => setForm({ ...form, name: text })}
                                placeholder="e.g. Semi Suite Hut"
                            />

                            <Text style={styles.label}>Tamil Name</Text>
                            <TextInput
                                style={styles.input}
                                value={form.tamilName}
                                onChangeText={(text) => setForm({ ...form, tamilName: text })}
                                placeholder="e.g. குறிஞ்சி இல்லம்"
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.label}>Price (INR)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.price}
                                        onChangeText={(text) => setForm({ ...form, price: text })}
                                        placeholder="e.g. 4000"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Room Size</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form.size}
                                        onChangeText={(text) => setForm({ ...form, size: text })}
                                        placeholder="e.g. 256 SQ.FT"
                                    />
                                </View>
                            </View>

                            <View style={styles.acRow}>
                                <Text style={styles.label}>AC Room</Text>
                                <TouchableOpacity
                                    style={[styles.toggle, form.ac && styles.toggleActive]}
                                    onPress={() => setForm({ ...form, ac: !form.ac })}
                                >
                                    <View style={[styles.toggleCircle, form.ac && styles.toggleCircleActive]} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Manage Room Numbers</Text>
                            <View style={styles.roomNumInputRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={newRoomNumber}
                                    onChangeText={setNewRoomNumber}
                                    placeholder="e.g. V-101"
                                />
                                <TouchableOpacity style={styles.addNumBtn} onPress={addRoomNumber}>
                                    <Icon name="plus" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.roomNumChipsContainer}>
                                {form.roomNumbers.map((num) => (
                                    <View key={num} style={styles.roomNumBadge}>
                                        <Text style={styles.roomNumBadgeText}>{num}</Text>
                                        <TouchableOpacity onPress={() => removeRoomNumber(num)}>
                                            <Icon name="close-circle" size={16} color="#FFFFFF" style={{ marginLeft: 5 }} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {form.roomNumbers.length === 0 && (
                                    <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>No room numbers added yet</Text>
                                )}
                            </View>

                            <View style={styles.descriptionHeader}>
                                <Text style={styles.label}>Extra Descriptions</Text>
                                <TouchableOpacity style={styles.addDescBtn} onPress={addDescription}>
                                    <Icon name="plus-circle" size={20} color="#000" />
                                    <Text style={styles.addDescText}>ADD</Text>
                                </TouchableOpacity>
                            </View>

                            {form.descriptions.map((desc, index) => (
                                <View key={index} style={styles.descInputRow}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        value={desc}
                                        onChangeText={(text) => updateDescription(text, index)}
                                        placeholder={`Description line ${index + 1}`}
                                    />
                                    <TouchableOpacity
                                        style={styles.removeDescBtn}
                                        onPress={() => removeDescription(index)}
                                    >
                                        <Icon name="minus-circle" size={24} color="#D32F2F" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <View style={{ height: 20 }} />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveBtnText}>{editingRoom ? 'UPDATE ROOM' : 'ADD ROOM'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            {renderBookingModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10
    },
    backBtn: { flexDirection: 'row', alignItems: 'center' },
    backText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
    badge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20
    },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    listContent: { padding: 12, paddingBottom: 100 },
    cardWrapper: { marginBottom: 20 },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        padding: 15,
        borderWidth: 2,
        borderColor: '#000',
    },
    adminActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    actionBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#000',
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginRight: 10,
    },
    addBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    formContent: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: '#000',
        backgroundColor: '#F9F9F9',
    },
    row: {
        flexDirection: 'row',
    },
    acRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 15,
        marginBottom: 20,
    },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#DDD',
        padding: 2,
    },
    toggleActive: {
        backgroundColor: '#10B981',
    },
    toggleCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFF',
    },
    toggleCircleActive: {
        alignSelf: 'flex-end',
    },
    saveBtn: {
        backgroundColor: '#F9D423',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        borderWidth: 2,
        borderColor: '#000',
    },
    saveBtnText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '900',
    },
    topSection: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    imageContainer: {
        width: '50%',
        aspectRatio: 1,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#FFF',
        overflow: 'hidden',
    },
    roomImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderImg: {
        flex: 1,
        backgroundColor: '#EAEAEA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tamilNameOverlay: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tamilNameSmall: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    infoContainer: {
        flex: 1,
        paddingLeft: 15,
        justifyContent: 'center',
    },
    roomType: {
        fontSize: 22,
        fontWeight: '900',
        color: '#000',
        textTransform: 'uppercase',
    },
    tamilNameBig: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginTop: 5,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 15,
    },
    perDay: {
        fontSize: 10,
        fontWeight: '900',
        color: '#000',
    },
    currency: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000',
        marginLeft: 5,
    },
    price: {
        fontSize: 24,
        fontWeight: '900',
        color: '#000',
    },
    exclusive: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#555',
        marginTop: -5,
    },
    sizeBadge: {
        borderWidth: 1.5,
        borderColor: '#000',
        borderStyle: 'dashed',
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    sizeText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000',
    },
    subImagesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    subImagePlaceholder: {
        width: '31%',
        aspectRatio: 1.2,
        backgroundColor: '#EAEAEA',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    facilitySection: {
        borderWidth: 1,
        borderColor: '#555',
        borderStyle: 'dashed',
        borderRadius: 15,
        padding: 10,
        marginBottom: 15,
    },
    facilityTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#8B0000',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 2,
    },
    facilityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    facilityItem: {
        width: '33%',
        alignItems: 'center',
        marginBottom: 12,
    },
    facilityIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    facilityName: {
        fontSize: 7.5,
        fontWeight: '900',
        color: '#8B0000',
        textAlign: 'center',
    },
    footerSection: {
        paddingHorizontal: 5,
        marginBottom: 20,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        backgroundColor: '#000',
        marginTop: 6,
        marginRight: 10,
    },
    footerText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#000',
    },
    boldText: {
        fontWeight: '900',
    },
    acContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    policyText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#000',
        lineHeight: 16,
        flex: 1,
    },
    bookButton: {
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 10,
    },
    bookButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '900',
        marginRight: 10,
    },
    imagePickerContainer: {
        position: 'relative',
        marginBottom: 10,
    },
    pickImgBtn: {
        width: '100%',
        aspectRatio: 1.8,
        backgroundColor: '#F3F4F6',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    pickImgText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    removeImgBtn: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#FFF',
        borderRadius: 15,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    descriptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 10,
    },
    addDescBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9D423',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#000',
    },
    addDescText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 5,
        color: '#000',
    },
    descInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    removeDescBtn: {
        marginLeft: 10,
        padding: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottieAnimation: {
        width: screenWidth * 0.8,
        height: screenWidth * 0.8,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    // Booking Modal Styles
    bookingModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    bookingModalContainer: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '85%',
        elevation: 10,
    },
    bookingModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    bookingModalTitle: {
        fontSize: 22,
        fontWeight: '900',
    },
    selectedRoomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    miniRoomIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedRoomName: {
        fontSize: 18,
        fontWeight: '800',
    },
    selectedRoomType: {
        fontSize: 13,
        marginTop: 2,
    },
    formSectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
        marginTop: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    roomNumbersRow: {
        paddingVertical: 5,
        gap: 8,
    },
    roomNumberChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
        marginRight: 10,
    },
    roomNumberText: {
        fontSize: 16,
        fontWeight: '800',
    },
    bookingTypeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    typeOption: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    typeOptionText: {
        fontSize: 15,
        fontWeight: '700',
    },
    bookingInput: {
        borderWidth: 2,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontWeight: '600',
    },
    bookingTotalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 25,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    bookingTotalLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: '#666',
    },
    bookingTotalValue: {
        fontSize: 28,
        fontWeight: '900',
        color: '#10B981',
    },
    bookingModalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 25,
    },
    bookingCancelBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 2,
    },
    bookingCancelText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#666',
    },
    bookingConfirmBtn: {
        flex: 2,
        flexDirection: 'row',
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    bookingConfirmText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '900',
    },
    roomNumInputRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    addNumBtn: {
        backgroundColor: '#10B981',
        borderRadius: 10,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomNumChipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 15,
        padding: 5,
    },
    roomNumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    roomNumBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default RoomsPackageScreen;
