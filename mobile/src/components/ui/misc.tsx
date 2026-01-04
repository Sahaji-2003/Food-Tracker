import * as React from 'react';
import { View, Pressable } from 'react-native';
import { cn } from '@/lib/cn';

const Separator = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View> & {
        orientation?: 'horizontal' | 'vertical';
    }
>(({ className, orientation = 'horizontal', ...props }, ref) => (
    <View
        ref={ref}
        className={cn(
            'bg-border',
            orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
            className
        )}
        {...props}
    />
));
Separator.displayName = 'Separator';

const Skeleton = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn('rounded-md bg-muted animate-pulse', className)}
        {...props}
    />
));
Skeleton.displayName = 'Skeleton';

const IconButton = React.forwardRef<
    React.ElementRef<typeof Pressable>,
    React.ComponentPropsWithoutRef<typeof Pressable> & {
        size?: 'sm' | 'default' | 'lg';
    }
>(({ className, size = 'default', ...props }, ref) => {
    const sizeClasses = {
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        lg: 'h-12 w-12',
    };

    return (
        <Pressable
            ref={ref}
            className={cn(
                'items-center justify-center rounded-full bg-secondary',
                sizeClasses[size],
                className
            )}
            {...props}
        />
    );
});
IconButton.displayName = 'IconButton';

export { Separator, Skeleton, IconButton };
