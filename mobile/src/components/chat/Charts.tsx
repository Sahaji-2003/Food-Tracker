/**
 * Custom Chart Components for Analytics
 * Built with react-native-svg + View-based bar charts.
 * No external chart library needed.
 */

import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

// ═══════════════════════════════════════
//  Circular Progress Ring
// ═══════════════════════════════════════
export function CircularProgress({
    percentage,
    size = 120,
    strokeWidth = 10,
    color = '#14b8a6',
    bgColor = '#333',
    label,
    sublabel,
    labelColor = '#ffffff',
}: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    bgColor?: string;
    label?: string;
    sublabel?: string;
    labelColor?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedPct = Math.min(Math.max(percentage, 0), 100);
    const strokeDashoffset = circumference - (circumference * clampedPct) / 100;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
                <Defs>
                    <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={color} stopOpacity="1" />
                        <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
                    </LinearGradient>
                </Defs>
                {/* Background circle */}
                <Circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke={bgColor} strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress arc */}
                <Circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="url(#grad)" strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            {/* Center label */}
            <View style={{
                position: 'absolute', alignItems: 'center', justifyContent: 'center',
            }}>
                {label && (
                    <Text style={{ color: labelColor, fontSize: size * 0.2, fontWeight: 'bold' }}>
                        {label}
                    </Text>
                )}
                {sublabel && (
                    <Text style={{ color: labelColor, fontSize: size * 0.1, opacity: 0.7, marginTop: 2 }}>
                        {sublabel}
                    </Text>
                )}
            </View>
        </View>
    );
}


// ═══════════════════════════════════════
//  Bar Chart (Weekly Trend)
// ═══════════════════════════════════════
export function BarChart({
    data,
    barColor = '#14b8a6',
    barBgColor = '#333',
    labelColor = '#888',
    valueColor = '#fff',
    height = 140,
}: {
    data: { label: string; value: number; limit?: number }[];
    barColor?: string;
    barBgColor?: string;
    labelColor?: string;
    valueColor?: string;
    height?: number;
}) {
    const maxValue = Math.max(...data.map(d => d.value), ...data.map(d => d.limit || 0), 1);
    const barHeight = height - 30; // leave room for labels

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, justifyContent: 'space-between' }}>
            {data.map((item, i) => {
                const pct = Math.min((item.value / maxValue) * 100, 100);
                const overBudget = item.limit ? item.value > item.limit : false;

                return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', marginHorizontal: 2 }}>
                        {/* Value label on top */}
                        <Text style={{
                            color: valueColor, fontSize: 9, fontWeight: '600',
                            marginBottom: 4, opacity: 0.8,
                        }}>
                            {item.value > 0 ? item.value.toLocaleString() : ''}
                        </Text>
                        {/* Bar */}
                        <View style={{
                            width: '70%',
                            height: barHeight,
                            backgroundColor: barBgColor,
                            borderRadius: 6,
                            overflow: 'hidden',
                            justifyContent: 'flex-end',
                        }}>
                            <View style={{
                                width: '100%',
                                height: `${pct}%`,
                                backgroundColor: overBudget ? '#f59e0b' : barColor,
                                borderRadius: 6,
                                minHeight: item.value > 0 ? 4 : 0,
                            }} />
                        </View>
                        {/* Day label */}
                        <Text style={{ color: labelColor, fontSize: 10, marginTop: 4, fontWeight: '500' }}>
                            {item.label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}


// ═══════════════════════════════════════
//  Macro Breakdown Bars
// ═══════════════════════════════════════
export function MacroBreakdown({
    protein, carbs, fat,
    labelColor = '#888',
    valueColor = '#fff',
}: {
    protein: number;
    carbs: number;
    fat: number;
    labelColor?: string;
    valueColor?: string;
}) {
    const total = protein + carbs + fat || 1;
    const items = [
        { label: 'Protein', value: protein, color: '#22c55e', pct: (protein / total) * 100 },
        { label: 'Carbs', value: carbs, color: '#3b82f6', pct: (carbs / total) * 100 },
        { label: 'Fat', value: fat, color: '#f59e0b', pct: (fat / total) * 100 },
    ];

    return (
        <View>
            {/* Stacked horizontal bar */}
            <View style={{
                flexDirection: 'row', height: 14,
                borderRadius: 7, overflow: 'hidden', marginBottom: 12,
            }}>
                {items.map((item, i) => (
                    <View key={i} style={{
                        flex: item.pct || 0.1,
                        backgroundColor: item.color,
                    }} />
                ))}
            </View>

            {/* Labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {items.map((item, i) => (
                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                        <View style={{
                            width: 10, height: 10, borderRadius: 5,
                            backgroundColor: item.color, marginBottom: 4,
                        }} />
                        <Text style={{ color: valueColor, fontSize: 16, fontWeight: 'bold' }}>
                            {item.value}g
                        </Text>
                        <Text style={{ color: labelColor, fontSize: 11, marginTop: 1 }}>
                            {item.label}
                        </Text>
                        <Text style={{ color: labelColor, fontSize: 10, opacity: 0.7 }}>
                            {item.pct.toFixed(0)}%
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}


// ═══════════════════════════════════════
//  Mini Stat Tile
// ═══════════════════════════════════════
export function StatTile({
    icon,
    value,
    label,
    color,
    bgColor,
}: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    color: string;
    bgColor: string;
}) {
    return (
        <View style={{
            flex: 1, backgroundColor: bgColor, borderRadius: 14,
            padding: 14, alignItems: 'center', marginHorizontal: 4,
        }}>
            {icon}
            <Text style={{ color, fontSize: 18, fontWeight: 'bold', marginTop: 6 }}>
                {value}
            </Text>
            <Text style={{ color: color + '99', fontSize: 10, marginTop: 2 }}>
                {label}
            </Text>
        </View>
    );
}
