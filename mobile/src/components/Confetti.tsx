import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

interface ConfettiProps {
    visible: boolean;
    onComplete?: () => void;
    autoHide?: boolean; // Auto hide after animation
    duration?: number; // Duration in ms before hiding
}

const Confetti: React.FC<ConfettiProps> = ({
    visible,
    onComplete,
    autoHide = true,
    duration = 3000
}) => {
    const [show, setShow] = useState(visible);

    useEffect(() => {
        if (visible) {
            setShow(true);
            if (autoHide) {
                const timer = setTimeout(() => {
                    setShow(false);
                    onComplete?.();
                }, duration);
                return () => clearTimeout(timer);
            }
        } else {
            setShow(false);
        }
    }, [visible, autoHide, duration, onComplete]);

    if (!show) return null;

    return (
        <View style={styles.container} pointerEvents="none">
            <LottieView
                source={{ uri: 'https://lottie.host/2183ddd6-648a-4ead-9fcb-c0fef0bba6d7/PUxlLYFaf8.lottie' }}
                style={styles.lottie}
                autoPlay
                loop={false}
                onAnimationFinish={() => {
                    if (!autoHide) {
                        setShow(false);
                        onComplete?.();
                    }
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottie: {
        width: width,
        height: height,
    },
});

export default Confetti;
