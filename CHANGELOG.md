# Changelog - Hevy Dashboard Updates

## 2026-02-15 - Theme System & Time Period Filters

### ✨ New Features

#### 1. **Dark/Light Theme Toggle**
- Added comprehensive theme system with dark and light modes
- Theme preference is saved in localStorage and persists across sessions
- New theme toggle in Settings page with visual icons (Moon/Sun)
- Smooth transitions between themes

**Theme Colors:**
- **Dark Theme**: Deep blacks with vibrant accent colors for better contrast
  - Primary: `#6B7FFF` (Brighter blue)
  - Background: `#050505` / `#121212`
  - Text: High contrast whites and grays
  
- **Light Theme**: Clean whites with professional blues and grays
  - Primary: `#4F5FD9` (Darker blue for contrast)
  - Background: `#F5F7FA` / `#FFFFFF`
  - Text: Dark grays for readability

#### 2. **Time Period Filters**
Added time period switches (Mes, Año, Todos) to:
- **Analytics Page**: Filter muscle distribution and weekly volume trends
- **Progression Page**: Filter exercise history and progression charts

**Implementation:**
- Frontend: Toggle buttons with active state styling
- Backend: Query parameter support (`?period=month|year|all`)
- Date filtering in SQL queries for both analytics and exercise history

#### 3. **Improved Chart Colors**
- Replaced hardcoded colors with CSS variables for theme compatibility
- Better contrast and readability in both dark and light modes
- Chart colors automatically adapt to selected theme

**Chart Color Variables:**
```css
--chart-1: #6B7FFF (Blue)
--chart-2: #3DD68C (Green)
--chart-3: #FFC940 (Yellow)
--chart-4: #FF5C5C (Red)
--chart-5: #A78BFA (Purple)
--chart-6: #34D399 (Teal)
--chart-7: #60A5FA (Light Blue)
```

### 📝 Files Modified

#### Frontend
1. **`client/src/index.css`**
   - Added dual theme system with CSS variables
   - Improved color contrast for better readability
   - Added chart color variables

2. **`client/src/pages/Settings.jsx`**
   - Added theme state management
   - Theme toggle UI with Moon/Sun icons
   - localStorage integration for theme persistence
   - Auto-apply theme on component mount

3. **`client/src/pages/Settings.css`**
   - Added `.theme-toggle` and `.theme-btn` styles
   - Active state styling with gradient background
   - Smooth hover transitions

4. **`client/src/pages/Analytics.jsx`**
   - Added `timePeriod` state ('month', 'year', 'all')
   - Time period toggle UI
   - Updated API calls to include period parameter
   - Replaced hardcoded colors with CSS variables

5. **`client/src/pages/Analytics.css`**
   - Added `.page-header` layout
   - Added `.time-period-toggle` and `.period-btn` styles
   - Responsive design for toggle buttons

6. **`client/src/pages/Progression.jsx`**
   - Added `timePeriod` state
   - Time period toggle UI
   - Updated API calls to include period parameter
   - Updated chart colors to use CSS variables

7. **`client/src/pages/Progression.css`**
   - Added page header and time period toggle styles
   - Consistent styling with Analytics page

#### Backend
1. **`server/routes/analytics.js`**
   - Added period query parameter handling
   - Date filtering logic (month/year/all)
   - Dynamic SQL WHERE clause construction

2. **`server/routes/exercises.js`**
   - Added period query parameter handling
   - Date filtering for exercise history
   - Consistent filtering logic with analytics

### 🎨 UI/UX Improvements

1. **Better Readability**
   - Increased contrast in dark theme
   - Professional color palette in light theme
   - Improved text colors (lighter grays in dark mode)

2. **Consistent Design**
   - Unified time period toggle across pages
   - Consistent button styling and interactions
   - Smooth transitions and hover effects

3. **Accessibility**
   - Clear visual feedback for active states
   - High contrast color combinations
   - Readable font sizes and weights

### 🔧 Technical Details

**Theme Implementation:**
```javascript
// Theme is stored in localStorage
localStorage.setItem('theme', 'dark' | 'light');

// Applied via data attribute on body
document.body.setAttribute('data-theme', theme);
```

**Time Period Filtering:**
```javascript
// Frontend
const [timePeriod, setTimePeriod] = useState('all');
axios.get(`/api/analytics?period=${timePeriod}`);

// Backend
const period = req.query.period || 'all';
if (period === 'month') {
  // Filter last 30 days
} else if (period === 'year') {
  // Filter last 365 days
}
```

### 📱 Responsive Design
- Time period toggles adapt to smaller screens
- Theme toggle buttons stack on mobile
- Consistent spacing and padding across devices

### 🐛 Known Issues
- CSS linter warnings for `@tailwind` directives (expected, not actual errors)
- These warnings don't affect functionality

### 🚀 Next Steps
Consider adding:
- Custom date range picker
- More granular time periods (week, quarter)
- Theme preference sync with user account
- Animated theme transitions
