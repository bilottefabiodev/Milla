/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                mystic: {
                    50: '#f4f4f5',
                    100: '#e4e4e7',
                    200: '#d1d5db',
                    300: '#9ca3af',
                    400: '#6b7280',
                    500: '#3f3f46',
                    600: '#27272a',
                    700: '#18181b',
                    800: '#12121a', // Card bg
                    900: '#0f0f13',
                    950: '#050505', // Deep Mystic Black (Updated)
                },
                gold: {
                    100: '#fbf5e6', // Text light
                    200: '#f5e6c8',
                    300: '#eecd95',
                    400: '#d4af37', // Primary Gold
                    500: '#c5a028',
                    600: '#a3821a',
                    700: '#856612',
                    800: '#2a2415', // Border default
                    900: '#1a160d',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Cinzel', 'serif'],
            },
            animation: {
                'spin-slow': 'spin 8s linear infinite',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                }
            },
            boxShadow: {
                'glow': '0 0 20px rgba(212, 175, 55, 0.15)',
                'glow-lg': '0 0 40px rgba(212, 175, 55, 0.3)',
            },
        },
    },
    plugins: [],
}
