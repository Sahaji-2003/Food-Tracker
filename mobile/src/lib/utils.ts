// Format date for display
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

// Format time for display
export function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

// Grade colors for React Native (hex values instead of Tailwind classes)
export const gradeColors: Record<string, string> = {
    'A+': '#22c55e', // green-500
    'A': '#4ade80',  // green-400
    'B+': '#facc15', // yellow-400
    'B': '#facc15',  // yellow-400
    'C+': '#fb923c', // orange-400
    'C': '#fb923c',  // orange-400
    'D+': '#f87171', // red-400
    'D': '#f87171',  // red-400
    'F': '#ef4444',  // red-500
};

export function getGradeColor(grade: string): string {
    return gradeColors[grade] || '#9ca3af'; // gray-400 as fallback
}

// Grade background colors with opacity
export const gradeBgColors: Record<string, string> = {
    'A+': 'rgba(34, 197, 94, 0.1)',
    'A': 'rgba(74, 222, 128, 0.1)',
    'B+': 'rgba(250, 204, 21, 0.1)',
    'B': 'rgba(250, 204, 21, 0.1)',
    'C+': 'rgba(251, 146, 60, 0.1)',
    'C': 'rgba(251, 146, 60, 0.1)',
    'D+': 'rgba(248, 113, 113, 0.1)',
    'D': 'rgba(248, 113, 113, 0.1)',
    'F': 'rgba(239, 68, 68, 0.1)',
};

export function getGradeBgColor(grade: string): string {
    return gradeBgColors[grade] || 'rgba(156, 163, 175, 0.1)';
}

// Calculate calorie percentage
export function calculateCaloriePercentage(consumed: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min((consumed / target) * 100, 100);
}

// Format calories with commas
export function formatCalories(calories: number): string {
    return new Intl.NumberFormat('en-US').format(calories);
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

// Check if a date is today
export function isToday(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.toDateString() === today.toDateString();
}
