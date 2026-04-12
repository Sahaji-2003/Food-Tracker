import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/useThemeStore';

/**
 * Generative AI Dynamic UI Engine
 * Parses JSON schemas sent by the AI and recursively builds native React Native UI.
 */

interface DynamicProps {
    layout: any[];
}

export function DynamicUIRenderer({ layout }: DynamicProps) {
    const { colors } = useThemeStore();

    if (!Array.isArray(layout)) return null;

    return (
        <View style={{ width: '100%', gap: 12 }}>
            {layout.map((component, index) => {
                const key = `dyn-${index}`;

                switch (component.type) {
                    case 'Heading':
                        return (
                            <Text key={key} style={{ 
                                fontSize: 20, 
                                fontWeight: 'bold', 
                                color: component.color || colors.foreground,
                                marginTop: index > 0 ? 8 : 0
                            }}>
                                {component.text}
                            </Text>
                        );

                    case 'Text':
                        return (
                            <Text key={key} style={{ 
                                fontSize: 14, 
                                color: component.color || colors.mutedForeground,
                                lineHeight: 22
                            }}>
                                {component.text}
                            </Text>
                        );

                    case 'Row':
                        return (
                            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {component.items && <DynamicUIRenderer layout={component.items} />}
                            </View>
                        );
                        
                    case 'Column':
                        return (
                            <View key={key} style={{ flexDirection: 'column', gap: 8 }}>
                                {component.items && <DynamicUIRenderer layout={component.items} />}
                            </View>
                        );

                    case 'Badge':
                        return (
                            <View key={key} style={{ 
                                backgroundColor: (component.bgColor || colors.primary) + '20', 
                                paddingHorizontal: 12, 
                                paddingVertical: 6, 
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: (component.bgColor || colors.primary) + '40'
                            }}>
                                <Text style={{ color: component.bgColor || colors.primary, fontSize: 12, fontWeight: '600' }}>
                                    {component.text}
                                </Text>
                            </View>
                        );

                    case 'Divider':
                        return (
                            <View key={key} style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                        );

                    case 'ValueProp':
                        return (
                            <View key={key} style={{ 
                                backgroundColor: colors.muted, 
                                padding: 16, 
                                borderRadius: 12,
                                alignItems: 'center',
                                flex: 1
                            }}>
                                <Text style={{ fontSize: 24, fontWeight: 'bold', color: component.color || colors.foreground }}>
                                    {component.value}
                                </Text>
                                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' }}>
                                    {component.label}
                                </Text>
                            </View>
                        );
                        
                    case 'Card':
                         return (
                            <View key={key} style={{ 
                                backgroundColor: colors.card, 
                                padding: 16, 
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: colors.border
                            }}>
                                {component.items && <DynamicUIRenderer layout={component.items} />}
                            </View>
                        );

                    default:
                        // Fallback for unknown elements
                        return (
                            <Text key={key} style={{ color: 'red', fontSize: 10 }}>
                                [Unknown UI element: {component.type}]
                            </Text>
                        );
                }
            })}
        </View>
    );
}
