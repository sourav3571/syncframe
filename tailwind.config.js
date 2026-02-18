/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#09090b", // Zinc 950
                surface: "#18181b",    // Zinc 900
                surfaceHighlight: "#27272a", // Zinc 800
                border: "#3f3f46",     // Zinc 700
                textMain: "#e4e4e7",   // Zinc 200
                textDim: "#a1a1aa",    // Zinc 400
                accent: "#ffffff",     // White accent for high contrast "Pro" look
            },
        },
    },
    plugins: [],
}
