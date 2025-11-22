# Theme System Documentation

## Overview

The application uses a centralized theme system defined in `src/styles/_theme.scss` for consistent styling and easy customization across all components.

## Theme File Location

- **Main Theme File**: `src/styles/_theme.scss`
- **Import in Components**: `@import '../../../styles/theme';`

## Color Palette

### Primary Colors (Orange/Yellow Theme)

```scss
$primary: #ff8c42; // Main orange
$primary-dark: #ff7a2e; // Darker orange
$primary-light: #ffa366; // Lighter orange
$secondary: #ffd166; // Yellow
$secondary-dark: #ffb84d; // Darker yellow
$secondary-light: #ffe699; // Lighter yellow
```

### Gradients

```scss
$gradient-primary: linear-gradient(135deg, $primary 0%, $secondary 100%);
$gradient-primary-vertical: linear-gradient(
  180deg,
  $primary 0%,
  $secondary 100%
);
$gradient-primary-dark: linear-gradient(
  135deg,
  $primary 0%,
  $primary-dark 100%
);
```

### Status Colors

```scss
$success: #48bb78;
$danger: #f56565;
$warning: #ed8936;
$info: #4299e1;
```

### Neutral Colors (Grays)

```scss
$gray-50: #f7fafc; // Lightest
$gray-100: #edf2f7;
$gray-200: #e2e8f0; // Borders
$gray-300: #cbd5e0; // Light borders
$gray-400: #a0aec0; // Muted text
$gray-500: #718096; // Secondary text
$gray-600: #4a5568;
$gray-700: #2d3748; // Primary text
$gray-800: #1a202c;
$gray-900: #171923; // Darkest
```

## Typography

### Font Families

```scss
$font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
$font-family-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo;
```

### Font Sizes

```scss
$font-size-xs: 0.75rem; // 12px
$font-size-sm: 0.875rem; // 14px
$font-size-base: 0.95rem; // 15px
$font-size-lg: 1rem; // 16px
$font-size-xl: 1.125rem; // 18px
$font-size-2xl: 1.25rem; // 20px
```

### Font Weights

```scss
$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;
```

## Spacing System

```scss
$spacing-xs: 0.25rem; // 4px
$spacing-sm: 0.5rem; // 8px
$spacing-md: 0.75rem; // 12px
$spacing-lg: 1rem; // 16px
$spacing-xl: 1.5rem; // 24px
$spacing-2xl: 2rem; // 32px
$spacing-3xl: 3rem; // 48px
```

## Border Radius

```scss
$radius-xs: 4px;
$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 10px;
$radius-xl: 12px;
$radius-2xl: 16px;
$radius-full: 9999px; // Circle
```

## Shadows

```scss
$shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
$shadow-primary: 0 4px 12px rgba(255, 140, 66, 0.3);
```

## Transitions

```scss
$transition-fast: 0.15s ease;
$transition-base: 0.2s ease;
$transition-slow: 0.3s ease;
$transition-all: all 0.2s ease;
```

## Component-Specific Variables

### Sidebar

```scss
$sidebar-width: 160px;
$sidebar-bg: $gradient-primary-vertical;
$sidebar-text: rgba(255, 255, 255, 0.7);
$sidebar-text-active: $white;
```

### Cart Panel

```scss
$cart-width: 380px;
$cart-bg: $white;
```

### Touch Targets

```scss
$touch-target-sm: 36px;
$touch-target-md: 44px;
$touch-target-lg: 56px;
```

## Mixins

### Button Mixins

```scss
// Primary button with orange background
@include button-primary;

// Secondary button with yellow background
@include button-secondary;
```

### Input Mixin

```scss
// Standard input styling
@include input-base;
```

### Utility Mixins

```scss
// Add hover lift effect
@include hover-lift;

// Add focus ring
@include focus-ring($primary);

// Truncate text with ellipsis
@include truncate;

// Smooth scrollbar
@include smooth-scroll;

// Card styling
@include card;
```

### Responsive Mixins

```scss
@include respond-to(sm) {
  /* styles for 640px+ */
}
@include respond-to(md) {
  /* styles for 768px+ */
}
@include respond-to(lg) {
  /* styles for 1024px+ */
}
@include respond-to(xl) {
  /* styles for 1280px+ */
}
```

## Usage Examples

### Using Theme Colors

```scss
.my-component {
  background: $primary;
  color: $white;
  border: 1px solid $border-color;
  box-shadow: $shadow-md;
}
```

### Using Mixins

```scss
.my-button {
  @include button-primary;
  border-radius: $radius-lg;
}

.my-input {
  @include input-base;
}

.my-card {
  @include card;
  @include hover-lift;
}
```

### Using Spacing

```scss
.my-element {
  padding: $spacing-lg $spacing-xl;
  margin-bottom: $spacing-md;
  gap: $spacing-sm;
}
```

## Changing the Theme

To change the theme colors (e.g., from orange/yellow to blue/purple):

1. Open `src/styles/_theme.scss`
2. Update the primary color variables:

```scss
$primary: #4299e1; // Blue
$primary-dark: #3182ce; // Darker blue
$secondary: #9f7aea; // Purple
```

3. All components using theme variables will automatically update!

## Benefits

✅ **Centralized**: All colors and styles in one place
✅ **Consistent**: Same colors across all components
✅ **Scalable**: Easy to add new themes or variants
✅ **Maintainable**: Change theme in seconds
✅ **Type-safe**: SCSS variables catch typos at compile time
✅ **DRY**: Reusable mixins reduce code duplication
✅ **Responsive**: Built-in breakpoint system

## Component Import Pattern

Every component should import the theme at the top:

```scss
@import "../../../styles/theme";

.component-name {
  background: $bg-primary;
  color: $text-primary;
  // ... rest of styles
}
```

## Best Practices

1. **Always use theme variables** instead of hardcoded colors
2. **Use mixins** for common patterns
3. **Use spacing variables** for consistent margins/padding
4. **Use semantic names** (e.g., `$text-primary` instead of `$gray-700`)
5. **Test theme changes** by updating variables in `_theme.scss`
6. **Document custom variables** added to components
