import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
    TouchableWithoutFeedback,
} from 'react-native';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react-native';
import { useThemeStore } from '@/store/useThemeStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

interface AlertConfig {
    title: string;
    message: string;
    type?: AlertType;
    buttons?: AlertButton[];
}

interface AlertContextType {
    showAlert: (config: AlertConfig) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

interface AlertProviderProps {
    children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
    const { colors } = useThemeStore();
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<AlertConfig | null>(null);
    const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];
    const fadeAnim = useState(new Animated.Value(0))[0];

    const showAlert = (alertConfig: AlertConfig) => {
        setConfig(alertConfig);
        setVisible(true);
    };

    const hideAlert = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            setConfig(null);
        });
    };

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, slideAnim, fadeAnim]);

    const getIcon = () => {
        const iconSize = 32;
        switch (config?.type) {
            case 'success':
                return <CheckCircle size={iconSize} color="#22c55e" />;
            case 'error':
                return <AlertCircle size={iconSize} color="#ef4444" />;
            case 'warning':
                return <AlertTriangle size={iconSize} color="#f59e0b" />;
            case 'info':
            default:
                return <Info size={iconSize} color={colors.primary} />;
        }
    };

    const getIconBackground = () => {
        switch (config?.type) {
            case 'success':
                return '#22c55e20';
            case 'error':
                return '#ef444420';
            case 'warning':
                return '#f59e0b20';
            case 'info':
            default:
                return colors.primary + '20';
        }
    };

    const handleButtonPress = (button: AlertButton) => {
        hideAlert();
        if (button.onPress) {
            setTimeout(() => button.onPress?.(), 100);
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <Modal visible={visible} transparent animationType="none" onRequestClose={hideAlert}>
                <TouchableWithoutFeedback onPress={hideAlert}>
                    <Animated.View
                        style={{
                            flex: 1,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            justifyContent: 'flex-end',
                            opacity: fadeAnim,
                        }}
                    >
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <Animated.View
                                style={{
                                    backgroundColor: colors.background,
                                    borderTopLeftRadius: 24,
                                    borderTopRightRadius: 24,
                                    maxHeight: SCREEN_HEIGHT * 0.7,
                                    transform: [{ translateY: slideAnim }],
                                }}
                            >
                                {/* Handle Bar */}
                                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                                    <View
                                        style={{
                                            width: 40,
                                            height: 4,
                                            backgroundColor: colors.muted,
                                            borderRadius: 2,
                                        }}
                                    />
                                </View>

                                {/* Close Button */}
                                <TouchableOpacity
                                    onPress={hideAlert}
                                    style={{
                                        position: 'absolute',
                                        top: 16,
                                        right: 16,
                                        padding: 8,
                                        backgroundColor: colors.secondary,
                                        borderRadius: 20,
                                    }}
                                >
                                    <X size={20} color={colors.mutedForeground} />
                                </TouchableOpacity>

                                {/* Content */}
                                <ScrollView
                                    style={{ paddingHorizontal: 24 }}
                                    contentContainerStyle={{ paddingBottom: 32 }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {/* Icon */}
                                    <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 16 }}>
                                        <View
                                            style={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 32,
                                                backgroundColor: getIconBackground(),
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {getIcon()}
                                        </View>
                                    </View>

                                    {/* Title */}
                                    <Text
                                        style={{
                                            fontSize: 20,
                                            fontWeight: 'bold',
                                            color: colors.foreground,
                                            textAlign: 'center',
                                            marginBottom: 12,
                                        }}
                                    >
                                        {config?.title}
                                    </Text>

                                    {/* Message */}
                                    <Text
                                        style={{
                                            fontSize: 15,
                                            color: colors.mutedForeground,
                                            textAlign: 'center',
                                            lineHeight: 22,
                                            marginBottom: 24,
                                        }}
                                    >
                                        {config?.message}
                                    </Text>

                                    {/* Buttons */}
                                    <View style={{ gap: 10 }}>
                                        {(config?.buttons || [{ text: 'OK', style: 'default' }]).map((button, index) => {
                                            const isDestructive = button.style === 'destructive';
                                            const isCancel = button.style === 'cancel';

                                            return (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => handleButtonPress(button)}
                                                    style={{
                                                        paddingVertical: 14,
                                                        borderRadius: 12,
                                                        alignItems: 'center',
                                                        backgroundColor: isDestructive
                                                            ? colors.destructive
                                                            : isCancel
                                                                ? colors.secondary
                                                                : colors.primary,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 16,
                                                            fontWeight: '600',
                                                            color: isCancel ? colors.foreground : '#ffffff',
                                                        }}
                                                    >
                                                        {button.text}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Modal>
        </AlertContext.Provider>
    );
};
