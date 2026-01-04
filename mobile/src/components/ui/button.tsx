import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
    'flex flex-row items-center justify-center rounded-xl',
    {
        variants: {
            variant: {
                default: 'bg-primary',
                destructive: 'bg-destructive',
                outline: 'border border-border bg-transparent',
                secondary: 'bg-secondary',
                ghost: 'bg-transparent',
                link: 'bg-transparent',
            },
            size: {
                default: 'h-12 px-6',
                sm: 'h-10 px-4',
                lg: 'h-14 px-8',
                icon: 'h-12 w-12',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

const buttonTextVariants = cva('font-semibold', {
    variants: {
        variant: {
            default: 'text-primary-foreground',
            destructive: 'text-destructive-foreground',
            outline: 'text-foreground',
            secondary: 'text-secondary-foreground',
            ghost: 'text-foreground',
            link: 'text-primary underline',
        },
        size: {
            default: 'text-base',
            sm: 'text-sm',
            lg: 'text-lg',
            icon: 'text-base',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
    },
});

export interface ButtonProps
    extends React.ComponentPropsWithoutRef<typeof Pressable>,
    VariantProps<typeof buttonVariants> {
    children: React.ReactNode;
    isLoading?: boolean;
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
    ({ className, variant, size, children, isLoading, disabled, ...props }, ref) => {
        return (
            <Pressable
                ref={ref}
                className={cn(
                    buttonVariants({ variant, size }),
                    disabled && 'opacity-50',
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <ActivityIndicator
                        size="small"
                        color={variant === 'outline' || variant === 'ghost' ? '#f8fafc' : '#1e1b4b'}
                    />
                ) : typeof children === 'string' ? (
                    <Text className={cn(buttonTextVariants({ variant, size }))}>
                        {children}
                    </Text>
                ) : (
                    children
                )}
            </Pressable>
        );
    }
);

Button.displayName = 'Button';

export { Button, buttonVariants, buttonTextVariants };
