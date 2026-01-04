import * as React from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/cn';

const Card = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn(
            'rounded-2xl bg-card border border-border',
            className
        )}
        {...props}
    />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-5', className)}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View ref={ref} className={cn('p-5 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
    React.ElementRef<typeof View>,
    React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => (
    <View
        ref={ref}
        className={cn('flex flex-row items-center p-5 pt-0', className)}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
