import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Trash2, Bot, User, ImagePlus, X, Sparkles, MessageCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { chatAPI } from '@/lib/api';
import { useAlert } from '@/components/ui';
import { CardRenderer } from '@/components/chat/ChatCards';

interface UICard {
    card_type: string;
    data: Record<string, any>;
    actions: { label: string; action: string; payload?: any }[];
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    ui_cards?: UICard[];
    imageUri?: string;
    created_at?: string;
}

const LOADING_MESSAGES = [
    "Cooking up a response...",
    "Thinking about your health...",
    "Brewing nutrition tips...",
    "Calculating your macros...",
    "Plating your insights...",
    "Seasoning the advice...",
    "Scanning ingredients...",
    "Sifting through recipes...",
    "Mixing healthy ideas...",
    "Fetching food facts...",
    "Preparing your meal plan...",
    "Stirring the data...",
    "Garnishing the details...",
    "Balancing the nutrients...",
    "Whisking up some wisdom...",
];

const LoadingText = ({ color }: { color: string }) => {
    const [index, setIndex] = useState(Math.floor(Math.random() * LOADING_MESSAGES.length));
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const interval = setInterval(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                setIndex(prev => {
                    let next = Math.floor(Math.random() * LOADING_MESSAGES.length);
                    while (next === prev) {
                        next = Math.floor(Math.random() * LOADING_MESSAGES.length);
                    }
                    return next;
                });
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={color} style={{ marginRight: 8 }} />
            <Text style={{ color, fontSize: 14, fontStyle: 'italic' }}>
                {LOADING_MESSAGES[index]}
            </Text>
        </Animated.View>
    );
};

export default function ChatScreen() {
    const { colors } = useThemeStore();
    const { showAlert } = useAlert();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const markdownStyles = {
        body: { color: colors.foreground, fontSize: 15, lineHeight: 22 },
        heading1: { color: colors.foreground, fontSize: 18, fontWeight: 'bold' as const, marginTop: 8, marginBottom: 4 },
        heading2: { color: colors.foreground, fontSize: 16, fontWeight: '600' as const, marginTop: 6, marginBottom: 3 },
        strong: { fontWeight: 'bold' as const, color: colors.foreground },
        em: { fontStyle: 'italic' as const },
        bullet_list: { marginLeft: 8 },
        ordered_list: { marginLeft: 8 },
        list_item: { marginBottom: 4 },
        paragraph: { marginBottom: 8 },
        code_inline: { backgroundColor: colors.muted, paddingHorizontal: 4, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    };

    const fetchHistory = async () => {
        try {
            const data = await chatAPI.getHistory();
            setMessages(data.messages || []);
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // Prevents Android cropping bugs
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
        }
    };

    const sendMessage = async () => {
        if ((!input.trim() && !selectedImage) || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim() || (selectedImage ? '📷 Image shared' : ''),
            imageUri: selectedImage || undefined,
        };

        setMessages(prev => [...prev, userMessage]);
        const messageText = input.trim();
        const imageToSend = selectedImage;
        setInput('');
        setSelectedImage(null);
        setLoading(true);

        try {
            const data = await chatAPI.send(messageText, imageToSend || undefined);
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                ui_cards: data.ui_cards || [],
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        showAlert({
            title: 'Clear Chat',
            message: 'Are you sure you want to clear all messages?',
            type: 'warning',
            buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await chatAPI.clearHistory();
                            setMessages([]);
                        } catch (error) {
                            console.error('Failed to clear history:', error);
                        }
                    },
                },
            ],
        });
    };

    const scrollToEnd = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    useEffect(() => {
        scrollToEnd();
    }, [messages, loading]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            {/* Header with green Sparkles icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Sparkles size={28} color="#22c55e" fill="#4ade80" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.foreground }}>
                        Fit Buddy AI
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                        Your personal health assistant
                    </Text>
                </View>
                {messages.length > 0 && (
                    <TouchableOpacity onPress={clearHistory} style={{ padding: 8 }}>
                        <Trash2 size={20} color={colors.destructive} />
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {initialLoading ? (
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Loading chat...</Text>
                        </View>
                    ) : messages.length === 0 ? (
                        <View style={{ alignItems: 'center', marginTop: 20 }}>
                            {/* Lottie Chat Buddy Animation */}
                            <LottieView
                                source={{ uri: 'https://lottie.host/67866d35-74bb-4d0a-82d8-3201d5f54bef/N6cgEFzQDP.lottie' }}
                                style={{ width: 180, height: 180 }}
                                autoPlay
                                loop
                            />
                            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 8 }}>
                                Hi! I'm Fit Buddy
                            </Text>
                            <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }}>
                                Ask me anything about nutrition, meal planning, or your fitness goals. I can also analyze images you share!
                            </Text>
                            <View style={{ marginTop: 24 }}>
                                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>Try asking:</Text>
                                {[
                                    "What should I eat for dinner?",
                                    "Am I on track with my calories?",
                                    "Suggest a healthy snack",
                                ].map((suggestion, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => setInput(suggestion)}
                                        style={{
                                            backgroundColor: colors.secondary,
                                            paddingVertical: 10,
                                            paddingHorizontal: 16,
                                            borderRadius: 20,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <Text style={{ color: colors.foreground }}>{suggestion}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : (
                        messages.map((message) => (
                            <View
                                key={message.id}
                                style={{ marginBottom: 16 }}
                            >
                                {/* Message row: avatar + bubble (ALWAYS shown) */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    {message.role === 'assistant' && (
                                        <View style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: colors.primary + '20',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 8,
                                        }}>
                                            <Sparkles size={18} color={colors.primary} />
                                        </View>
                                    )}
                                    <View
                                        style={{
                                            maxWidth: '75%',
                                            backgroundColor: message.role === 'user' ? colors.primary : colors.secondary,
                                            borderRadius: 16,
                                            borderTopLeftRadius: message.role === 'assistant' ? 4 : 16,
                                            borderTopRightRadius: message.role === 'user' ? 4 : 16,
                                            padding: 12,
                                        }}
                                    >
                                        {message.imageUri && (
                                            <Image
                                                source={{ uri: message.imageUri }}
                                                style={{ width: 150, height: 150, borderRadius: 8, marginBottom: 8 }}
                                                resizeMode="cover"
                                            />
                                        )}
                                        {message.role === 'assistant' ? (
                                            <Markdown style={markdownStyles}>
                                                {message.content}
                                            </Markdown>
                                        ) : (
                                            <Text style={{ color: '#ffffff', fontSize: 15, lineHeight: 22 }}>
                                                {message.content}
                                            </Text>
                                        )}
                                    </View>
                                    {message.role === 'user' && (
                                        <View style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: colors.primary,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginLeft: 8,
                                        }}>
                                            <User size={18} color="#ffffff" />
                                        </View>
                                    )}
                                </View>

                                {/* Compact card previews BELOW the text bubble */}
                                {message.role === 'assistant' && message.ui_cards && message.ui_cards.length > 0 && (
                                    <View style={{ marginLeft: 40, marginTop: 8, marginRight: 16 }}>
                                        {message.ui_cards.map((card, cardIndex) => (
                                            <CardRenderer
                                                key={`${message.id}-card-${cardIndex}`}
                                                card={card}
                                                onActionComplete={() => scrollToEnd()}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                    {loading && (
                        <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' }}>
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: colors.primary + '20',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 8,
                            }}>
                                <Sparkles size={18} color={colors.primary} />
                            </View>
                            <View style={{
                                backgroundColor: colors.secondary,
                                borderRadius: 16,
                                borderTopLeftRadius: 4,
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                minWidth: 150,
                            }}>
                                <LoadingText color={colors.primary} />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Selected Image Preview */}
                {selectedImage && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={{ uri: selectedImage }} style={{ width: 60, height: 60, borderRadius: 8 }} />
                        <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ marginLeft: 8, padding: 4 }}>
                            <X size={20} color={colors.destructive} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
                    marginBottom: 20,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    backgroundColor: colors.background,
                }}>
                    <TouchableOpacity onPress={pickImage} style={{ padding: 8, marginRight: 4 }}>
                        <ImagePlus size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        placeholder="Ask Fit Buddy..."
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                        style={{
                            flex: 1,
                            backgroundColor: colors.secondary,
                            borderRadius: 20,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            paddingTop: 10,
                            color: colors.foreground,
                            fontSize: 16,
                            maxHeight: 100,
                        }}
                        editable={!loading}
                    />
                    <TouchableOpacity
                        onPress={sendMessage}
                        disabled={(!input.trim() && !selectedImage) || loading}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: (input.trim() || selectedImage) && !loading ? colors.primary : colors.muted,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 8,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Send size={20} color={(input.trim() || selectedImage) && !loading ? '#ffffff' : colors.mutedForeground} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
