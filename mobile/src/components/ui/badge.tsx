import * as React from 'react';
import { View, Text } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-3 py-1',
    {
        variants: {
            variant: {
                default: 'bg-primary',
                secondary: 'bg-secondary',
                destructive: 'bg-destructive',
                outline: 'border border-border bg-transparent',
                success: 'bg-green-500/20',
                warning: 'bg-yellow-500/20',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

const badgeTextVariants = cva('text-xs font-semibold', {
    variants: {
        variant: {
            default: 'text-primary-foreground',
            secondary: 'text-secondary-foreground',
            destructive: 'text-destructive-foreground',
            outline: 'text-foreground',
            success: 'text-green-400',
            warning: 'text-yellow-400',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

export interface BadgeProps
    extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof badgeVariants> {
    children: React.ReactNode;
}

const Badge = React.forwardRef<React.ElementRef<typeof View>, BadgeProps>(
    ({ className, variant, children, ...props }, ref) => {
        return (
            <View
                ref={ref}
                className={cn(badgeVariants({ variant }), className)}
                {...props}
            >
                {typeof children === 'string' ? (
                    <Text className={cn(badgeTextVariants({ variant }))}>{children}</Text>
                ) : (
                    children
                )}
            </View>
        );
    }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
