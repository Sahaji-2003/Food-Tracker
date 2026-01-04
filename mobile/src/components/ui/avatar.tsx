import * as React from 'react';
import { View, Image, Text } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const avatarVariants = cva(
    'relative flex items-center justify-center overflow-hidden rounded-full bg-secondary',
    {
        variants: {
            size: {
                sm: 'h-8 w-8',
                default: 'h-12 w-12',
                lg: 'h-16 w-16',
                xl: 'h-24 w-24',
            },
        },
        defaultVariants: {
            size: 'default',
        },
    }
);

const avatarTextVariants = cva('font-semibold text-foreground', {
    variants: {
        size: {
            sm: 'text-xs',
            default: 'text-base',
            lg: 'text-xl',
            xl: 'text-3xl',
        },
    },
    defaultVariants: {
        size: 'default',
    },
});

export interface AvatarProps
    extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof avatarVariants> {
    src?: string;
    alt?: string;
    fallback?: string;
}

const Avatar = React.forwardRef<React.ElementRef<typeof View>, AvatarProps>(
    ({ className, size, src, alt, fallback, ...props }, ref) => {
        const [hasError, setHasError] = React.useState(false);

        return (
            <View
                ref={ref}
                className={cn(avatarVariants({ size }), className)}
                {...props}
            >
                {src && !hasError ? (
                    <Image
                        source={{ uri: src }}
                        alt={alt}
                        className="h-full w-full"
                        resizeMode="cover"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <Text className={cn(avatarTextVariants({ size }))}>
                        {fallback || alt?.charAt(0).toUpperCase() || '?'}
                    </Text>
                )}
            </View>
        );
    }
);

Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };
