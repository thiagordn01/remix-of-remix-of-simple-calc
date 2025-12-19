import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
			extend: {
				colors: {
					border: 'hsl(var(--border))',
					input: 'hsl(var(--input))',
					ring: 'hsl(var(--ring))',
					background: 'hsl(var(--background))',
					foreground: 'hsl(var(--foreground))',
					primary: {
						DEFAULT: 'hsl(var(--primary))',
						foreground: 'hsl(var(--primary-foreground))'
					},
					secondary: {
						DEFAULT: 'hsl(var(--secondary))',
						foreground: 'hsl(var(--secondary-foreground))'
					},
					destructive: {
						DEFAULT: 'hsl(var(--destructive))',
						foreground: 'hsl(var(--destructive-foreground))'
					},
					muted: {
						DEFAULT: 'hsl(var(--muted))',
						foreground: 'hsl(var(--muted-foreground))'
					},
					accent: {
						DEFAULT: 'hsl(var(--accent))',
						foreground: 'hsl(var(--accent-foreground))'
					},
					popover: {
						DEFAULT: 'hsl(var(--popover))',
						foreground: 'hsl(var(--popover-foreground))'
					},
					card: {
						DEFAULT: 'hsl(var(--card))',
						foreground: 'hsl(var(--card-foreground))'
					},
					brand: {
						DEFAULT: 'hsl(var(--brand))',
						foreground: 'hsl(var(--brand-foreground))',
						glow: 'hsl(var(--brand-glow))',
						muted: 'hsl(var(--brand-muted))',
						dark: 'hsl(var(--brand-dark))'
					},
					success: {
						DEFAULT: 'hsl(var(--success))',
						foreground: 'hsl(var(--success-foreground))'
					},
					warning: {
						DEFAULT: 'hsl(var(--warning))',
						foreground: 'hsl(var(--warning-foreground))'
					},
					info: {
						DEFAULT: 'hsl(var(--info))',
						foreground: 'hsl(var(--info-foreground))'
					},
					sidebar: {
						DEFAULT: 'hsl(var(--sidebar-background))',
						foreground: 'hsl(var(--sidebar-foreground))',
						primary: 'hsl(var(--sidebar-primary))',
						'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
						accent: 'hsl(var(--sidebar-accent))',
						'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
						border: 'hsl(var(--sidebar-border))',
						ring: 'hsl(var(--sidebar-ring))'
					},
					golden: {
						50: 'hsl(48 100% 98%)',
						100: 'hsl(48 96% 92%)',
						200: 'hsl(47 92% 83%)',
						300: 'hsl(45 93% 73%)',
						400: 'hsl(43 96% 63%)',
						500: 'hsl(45 93% 55%)',
						600: 'hsl(42 89% 48%)',
						700: 'hsl(38 85% 42%)',
						800: 'hsl(35 80% 35%)',
						900: 'hsl(32 70% 28%)',
						950: 'hsl(30 60% 18%)'
					}
				},
				borderRadius: {
					lg: 'var(--radius)',
					md: 'calc(var(--radius) - 2px)',
					sm: 'calc(var(--radius) - 4px)'
				},
				keyframes: {
					'accordion-down': {
						from: { height: '0', opacity: '0' },
						to: { height: 'var(--radix-accordion-content-height)', opacity: '1' }
					},
					'accordion-up': {
						from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
						to: { height: '0', opacity: '0' }
					},
					'fade-in': {
						'0%': { opacity: '0', transform: 'translateY(10px)' },
						'100%': { opacity: '1', transform: 'translateY(0)' }
					},
					'fade-out': {
						'0%': { opacity: '1', transform: 'translateY(0)' },
						'100%': { opacity: '0', transform: 'translateY(10px)' }
					},
					'scale-in': {
						'0%': { transform: 'scale(0.95)', opacity: '0' },
						'100%': { transform: 'scale(1)', opacity: '1' }
					},
					'scale-out': {
						from: { transform: 'scale(1)', opacity: '1' },
						to: { transform: 'scale(0.95)', opacity: '0' }
					},
					'slide-in-right': {
						'0%': { transform: 'translateX(100%)' },
						'100%': { transform: 'translateX(0)' }
					},
					'slide-out-right': {
						'0%': { transform: 'translateX(0)' },
						'100%': { transform: 'translateX(100%)' }
					},
					'subtle-pulse': {
						'0%, 100%': { opacity: '1' },
						'50%': { opacity: '.85' }
					},
					'golden-glow': {
						'0%, 100%': {
							boxShadow: '0 0 20px hsl(45 93% 55% / 0.3), 0 0 40px hsl(45 93% 55% / 0.2)'
						},
						'50%': {
							boxShadow: '0 0 30px hsl(45 93% 55% / 0.5), 0 0 60px hsl(45 93% 55% / 0.3)'
						}
					},
					'shimmer': {
						'0%': { backgroundPosition: '-200% 0' },
						'100%': { backgroundPosition: '200% 0' }
					},
					'bounce-soft': {
						'0%, 100%': { transform: 'translateY(0)' },
						'50%': { transform: 'translateY(-5px)' }
					}
				},
				animation: {
					'accordion-down': 'accordion-down 0.2s ease-out',
					'accordion-up': 'accordion-up 0.2s ease-out',
					'fade-in': 'fade-in 0.3s ease-out',
					'fade-out': 'fade-out 0.3s ease-out',
					'scale-in': 'scale-in 0.2s ease-out',
					'scale-out': 'scale-out 0.2s ease-out',
					'slide-in-right': 'slide-in-right 0.3s ease-out',
					'slide-out-right': 'slide-out-right 0.3s ease-out',
					'enter': 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
					'exit': 'fade-out 0.3s ease-out, scale-out 0.2s ease-out',
					'subtle-pulse': 'subtle-pulse 3s ease-in-out infinite',
					'golden-glow': 'golden-glow 2s ease-in-out infinite',
					'shimmer': 'shimmer 3s linear infinite',
					'bounce-soft': 'bounce-soft 2s ease-in-out infinite'
				},
				boxShadow: {
					'golden': '0 8px 32px hsl(45 93% 55% / 0.25)',
					'golden-lg': '0 12px 48px hsl(45 93% 55% / 0.35)'
				}
			}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
