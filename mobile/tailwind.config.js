/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "hsl(222.2, 84%, 4.9%)",
                foreground: "hsl(210, 40%, 98%)",
                card: {
                    DEFAULT: "hsl(222.2, 84%, 4.9%)",
                    foreground: "hsl(210, 40%, 98%)",
                },
                popover: {
                    DEFAULT: "hsl(222.2, 84%, 4.9%)",
                    foreground: "hsl(210, 40%, 98%)",
                },
                primary: {
                    DEFAULT: "hsl(239, 84%, 67%)",
                    foreground: "hsl(222.2, 47.4%, 11.2%)",
                },
                secondary: {
                    DEFAULT: "hsl(217.2, 32.6%, 17.5%)",
                    foreground: "hsl(210, 40%, 98%)",
                },
                muted: {
                    DEFAULT: "hsl(217.2, 32.6%, 17.5%)",
                    foreground: "hsl(215, 20.2%, 65.1%)",
                },
                accent: {
                    DEFAULT: "hsl(217.2, 32.6%, 17.5%)",
                    foreground: "hsl(210, 40%, 98%)",
                },
                destructive: {
                    DEFAULT: "hsl(0, 62.8%, 30.6%)",
                    foreground: "hsl(210, 40%, 98%)",
                },
                border: "hsl(217.2, 32.6%, 17.5%)",
                input: "hsl(217.2, 32.6%, 17.5%)",
                ring: "hsl(239, 84%, 67%)",
                // Grade colors
                grade: {
                    aPlus: "#22c55e",
                    a: "#4ade80",
                    b: "#facc15",
                    c: "#fb923c",
                    d: "#f87171",
                    f: "#ef4444",
                },
            },
            fontFamily: {
                sans: ["Inter", "System"],
            },
        },
    },
    plugins: [],
};
