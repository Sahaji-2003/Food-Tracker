import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Trash2, Bot, User, ImagePlus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Markdown from 'react-native-markdown-display';
import { useThemeStore } from '@/store/useThemeStore';
import { chatAPI } from '@/lib/api';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    imageUri?: string;
    created_at?: string;
}

export default function ChatScreen() {
    const { colors } = useThemeStore();
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
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
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
        Alert.alert('Clear Chat', 'Are you sure you want to clear all messages?', [
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
        ]);
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
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Bot size={28} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
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
                        <View style={{ alignItems: 'center', marginTop: 40 }}>
                            <Text style={{ fontSize: 48, marginBottom: 16 }}>🤖</Text>
                            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
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
                                style={{
                                    flexDirection: 'row',
                                    marginBottom: 16,
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
                                        <Bot size={18} color={colors.primary} />
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
                                <Bot size={18} color={colors.primary} />
                            </View>
                            <View style={{
                                backgroundColor: colors.secondary,
                                borderRadius: 16,
                                borderTopLeftRadius: 4,
                                padding: 16,
                            }}>
                                <ActivityIndicator size="small" color={colors.primary} />
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
                    paddingBottom: Platform.OS === 'ios' ? 12 : 20,
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
