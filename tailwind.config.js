/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./pages/**/*.{js,jsx,ts,tsx}",
		"./pages/*.{js,jsx,ts,tsx}",
		"./components/*.{js,jsx,ts,tsx}",
		"./components/**/*.{js,jsx,ts,tsx}",
		"./components/*.scss",
		"./components/**/*.scss",
		"./styles/.*.scss",
		"./styles/**/.*.scss",
	],
	theme: {
		extend: {
			typography: (theme) => ({
				DEFAULT: {
					css: {
						color: theme('colors.sky.50'),
						'--tw-prose-headings': theme('colors.sky.50'),
						'--tw-prose-links': theme('colors.sky.50'),
					},
				},
			}),
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
	],
	mode: 'jit'
}
