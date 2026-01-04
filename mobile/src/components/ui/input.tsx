import * as React from 'react';
import { TextInput, View, Text } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

export interface InputProps
    extends React.ComponentPropsWithoutRef<typeof TextInput> {
    label?: string;
    error?: string;
}

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <View className="w-full">
                {label && (
                    <Text className="text-foreground mb-2 font-medium">{label}</Text>
                )}
                <TextInput
                    ref={ref}
                    className={cn(
                        'h-12 w-full rounded-xl bg-input px-4 text-base text-foreground',
                        'border border-border focus:border-ring',
                        error && 'border-destructive',
                        className
                    )}
                    placeholderTextColor={colors.mutedForeground}
                    {...props}
                />
                {error && (
                    <Text className="text-destructive text-sm mt-1">{error}</Text>
                )}
            </View>
        );
    }
);

Input.displayName = 'Input';

export { Input };
