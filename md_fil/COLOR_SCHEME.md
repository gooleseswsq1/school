/**
 * COLOR SCHEME STANDARDS
 * 
 * Primary Color: Blue (#155dfc / blue-600)
 * Secondary Color: Blue (#1447e6 / blue-700) - For hover/active states
 * Success Color: Green (#00c758 / green-500)
 * Error Color: Red (#F44336)
 * Warning Color: Amber (#fcbb00 / amber-400)
 * Info Color: Cyan (#0092b5 / cyan-600) - Dark mode only
 * 
 * Background Colors:
 * - Light BG: White (#fff) or Gray-50 (#f9fafb)
 * - Dark BG: Slate-800 (#1d293d) or Slate-900 (#0f172b)
 * - Hover BG: Blue-50 (#eff6ff) or Gray-100 (#f3f4f6)
 * 
 * Text Colors:
 * - Primary Text: Gray-900 (#111827) or Gray-100 (#f3f4f6) in dark
 * - Secondary Text: Gray-600 (#4b5563) or Gray-400 (#9ca3af) in dark
 * - Link Text: Blue-600 (#155dfc)
 * 
 * Border Colors:
 * - Default: Gray-200 (#e5e7eb) or Gray-700 (#374151) in dark
 * - Accent: Blue-600 (#155dfc)
 */

:root {
  /* Primary Colors */
  --color-primary: #155dfc;  /* blue-600 */
  --color-primary-dark: #1447e6;  /* blue-700 */
  
  /* Status Colors */
  --color-success: #00c758;
  --color-error: #dc3545;
  --color-warning: #fcbb00;
  --color-info: #0092b5;
  
  /* Neutral Colors */
  --color-text-primary: #111827;  /* gray-900 */
  --color-text-secondary: #4b5563;  /* gray-600 */
  --color-bg-light: #f9fafb;  /* gray-50 */
  --color-bg-white: #ffffff;
  --color-border: #e5e7eb;  /* gray-200 */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: #f3f4f6;  /* gray-100 */
    --color-text-secondary: #9ca3af;  /* gray-400 */
    --color-bg-light: #1d293d;  /* slate-800 */
    --color-bg-white: #0f172b;  /* slate-900 */
    --color-border: #374151;  /* gray-700 */
  }
}

/* Usage Guidelines:
 * 
 * 1. Button & Links:
 *    - Primary: bg-blue-600 text-white hover:bg-blue-700
 *    - Secondary: bg-gray-200 text-gray-900 hover:bg-gray-300
 *    - Danger: bg-red-600 text-white hover:bg-red-700
 * 
 * 2. Page Titles:
 *    - Color: text-blue-600
 *    - Font-size: text-2xl or text-3xl
 *    - Font-weight: font-bold
 * 
 * 3. Icons & Accents:
 *    - Primary accent: text-blue-600
 *    - Success: text-green-600
 *    - Error: text-red-600
 * 
 * 4. Input Fields:
 *    - Border: border-gray-300
 *    - Focus: border-blue-600 outline-none ring-1 ring-blue-600
 * 
 * 5. Cards & Containers:
 *    - Background: bg-white (light) / dark:bg-slate-900 (dark)
 *    - Border: border border-gray-200 dark:border-gray-700
 *    - Shadow: shadow-sm hover:shadow-md
 */
