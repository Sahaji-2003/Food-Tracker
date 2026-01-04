import * as React from 'react';
import { View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
} from 'react-native-reanimated';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof View> {
    value?: number;
    max?: number;
    indicatorClassName?: string;
}

const Progress = React.forwardRef<React.ElementRef<typeof View>, ProgressProps>(
    ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
        const progress = useSharedValue(0);

        React.useEffect(() => {
            progress.value = withTiming(Math.min(value, max) / max, { duration: 500 });
        }, [value, max, progress]);

        const animatedStyle = useAnimatedStyle(() => ({
            width: `${progress.value * 100}%`,
        }));

        return (
            <View
                ref={ref}
                className={cn(
                    'relative h-3 w-full overflow-hidden rounded-full bg-secondary',
                    className
                )}
                {...props}
            >
                <Animated.View
                    style={[
                        animatedStyle,
                        {
                            height: '100%',
                            backgroundColor: colors.primary,
                            borderRadius: 9999,
                        },
                    ]}
                    className={indicatorClassName}
                />
            </View>
        );
    }
);

Progress.displayName = 'Progress';

export { Progress };
