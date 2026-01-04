import * as React from 'react';
import { Text as RNText } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const textVariants = cva('text-foreground', {
    variants: {
        variant: {
            default: '',
            muted: 'text-muted-foreground',
            primary: 'text-primary',
            destructive: 'text-destructive',
        },
        size: {
            xs: 'text-xs',
            sm: 'text-sm',
            default: 'text-base',
            lg: 'text-lg',
            xl: 'text-xl',
            '2xl': 'text-2xl',
            '3xl': 'text-3xl',
            '4xl': 'text-4xl',
        },
        weight: {
            normal: 'font-normal',
            medium: 'font-medium',
            semibold: 'font-semibold',
            bold: 'font-bold',
        },
    },
    defaultVariants: {
        variant: 'default',
        size: 'default',
        weight: 'normal',
    },
});

export interface TextProps
    extends React.ComponentPropsWithoutRef<typeof RNText>,
    VariantProps<typeof textVariants> { }

const Text = React.forwardRef<React.ElementRef<typeof RNText>, TextProps>(
    ({ className, variant, size, weight, ...props }, ref) => {
        return (
            <RNText
                ref={ref}
                className={cn(textVariants({ variant, size, weight }), className)}
                {...props}
            />
        );
    }
);

Text.displayName = 'Text';

// Heading component for titles
const H1 = React.forwardRef<
    React.ElementRef<typeof RNText>,
    React.ComponentPropsWithoutRef<typeof RNText>
>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('text-4xl font-bold text-foreground', className)}
        {...props}
    />
));
H1.displayName = 'H1';

const H2 = React.forwardRef<
    React.ElementRef<typeof RNText>,
    React.ComponentPropsWithoutRef<typeof RNText>
>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('text-3xl font-bold text-foreground', className)}
        {...props}
    />
));
H2.displayName = 'H2';

const H3 = React.forwardRef<
    React.ElementRef<typeof RNText>,
    React.ComponentPropsWithoutRef<typeof RNText>
>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('text-2xl font-semibold text-foreground', className)}
        {...props}
    />
));
H3.displayName = 'H3';

const Muted = React.forwardRef<
    React.ElementRef<typeof RNText>,
    React.ComponentPropsWithoutRef<typeof RNText>
>(({ className, ...props }, ref) => (
    <RNText
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
Muted.displayName = 'Muted';

export { Text, textVariants, H1, H2, H3, Muted };
