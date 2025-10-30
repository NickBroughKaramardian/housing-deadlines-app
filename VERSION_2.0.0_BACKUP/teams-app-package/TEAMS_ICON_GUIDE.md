# 🎯 Microsoft Teams Icon Design Guide

## Overview

Creating seamless, native-looking icons for Microsoft Teams requires following specific design guidelines that ensure your app integrates perfectly with the Teams interface.

## 🎨 Key Design Principles

### 1. **Rounded Corners**
- **192x192 icons**: Use 12px border radius
- **32x32 icons**: Use 6px border radius
- This matches Teams' native app icons

### 2. **Color Palette**
- **Primary Blue**: `#3b82f6` (Teams blue)
- **Dark Blue**: `#1d4ed8` (for gradients)
- **White**: `#ffffff` (for text on colored backgrounds)
- **Transparent**: For outline icons

### 3. **Typography**
- **Font**: Segoe UI (Teams' default font)
- **Weight**: Bold for better visibility
- **Size**: 25% of icon size for text
- **Alignment**: Centered both horizontally and vertically

### 4. **Transparency**
- Always include transparent backgrounds
- Teams applies its own lighting effects
- Icons automatically adapt to light/dark themes

## 📐 Icon Specifications

### Color Icon (192x192)
```
Size: 192x192 pixels
Format: PNG with transparency
Border Radius: 12px
Background: Teams blue gradient
Text: White, bold, centered
Usage: App tabs, personal apps, store listings
```

### Outline Icon (32x32)
```
Size: 32x32 pixels
Format: PNG with transparency
Border Radius: 6px
Background: Transparent
Border: Teams blue (#3b82f6)
Text: Teams blue (#3b82f6)
Usage: Sidebar, navigation, small displays
```

## 🚀 How to Use the Icon Generator

### Step 1: Open the Generator
1. Open `create-teams-icon.html` in your browser
2. You'll see previews of both icon types

### Step 2: Download Icons
1. **Color Icon**: Click "Download 192x192" for the main icon
2. **Outline Icon**: Click "Download 32x32" for the small icon
3. **Additional Sizes**: Download 96x96 and 24x24 for fallbacks

### Step 3: Replace in Package
1. Replace `color.png` with your new 192x192 icon
2. Replace `outline.png` with your new 32x32 icon
3. Recreate your ZIP package

## ✨ Native Teams Features

### Automatic Lighting Effects
Teams automatically applies:
- **Hover animations**: Scale and glow effects
- **Focus states**: Highlighted borders
- **Dark mode adaptation**: Automatic color adjustments
- **Loading states**: Smooth transitions

### Seamless Integration
Your icons will:
- ✅ Match native Teams app styling
- ✅ Light up like other Teams icons
- ✅ Adapt to Teams themes automatically
- ✅ Scale properly on all devices
- ✅ Work in all Teams contexts

## 🎯 Design Best Practices

### Do's ✅
- Use Teams blue color palette
- Include transparent backgrounds
- Use rounded corners (12px/6px)
- Keep text simple and readable
- Test at small sizes
- Use bold typography

### Don'ts ❌
- Don't use custom colors that clash with Teams
- Don't use square corners
- Don't include complex backgrounds
- Don't use thin or decorative fonts
- Don't make text too small
- Don't use gradients that don't match Teams

## 🔧 Technical Implementation

### Canvas Generation
The icon generator uses HTML5 Canvas to create:
- Perfect pixel alignment
- Proper transparency
- Consistent sizing
- High-quality PNG output

### Color Values
```css
/* Teams Blue Palette */
--teams-blue: #3b82f6;
--teams-blue-dark: #1d4ed8;
--teams-blue-darker: #1e40af;
--teams-blue-darkest: #1e3a8a;

/* Gradients */
--teams-gradient: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
--teams-gradient-dark: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
```

## 📱 Responsive Behavior

### Different Contexts
Your icons will appear in:
- **Channel tabs**: 192x192 color icon
- **Personal apps**: 192x192 color icon
- **Sidebar**: 32x32 outline icon
- **Search results**: Various sizes
- **Mobile app**: Scaled versions

### Automatic Scaling
Teams automatically:
- Scales icons for different screen sizes
- Maintains aspect ratios
- Applies appropriate lighting
- Handles high-DPI displays

## 🎨 Customization Options

### Text Variations
You can customize the text in the generator:
- **"C&C"**: Current branding
- **"PM"**: Project Manager
- **"CC"**: C&C Development
- **"T"**: Tasks

### Color Variations
The generator includes:
- **Primary**: Teams blue gradient
- **Dark Mode**: Darker blue gradient
- **Outline**: Transparent with blue border

## 🚀 Quick Start

1. **Open** `create-teams-icon.html` in your browser
2. **Preview** the different icon styles
3. **Download** the 192x192 and 32x32 versions
4. **Replace** the icons in your app package
5. **Test** in Teams to see the seamless integration

## 🎉 Result

Your C&C Project Manager will have icons that:
- ✅ Look like native Teams apps
- ✅ Light up and animate like other Teams icons
- ✅ Adapt to Teams themes automatically
- ✅ Scale perfectly on all devices
- ✅ Integrate seamlessly with the Teams interface

## 📞 Support

If you need help with icon design:
- Check the preview in the generator
- Test different text variations
- Ensure proper sizing and transparency
- Verify the icons work in Teams

Your app will now have professional, native-looking icons that seamlessly integrate with Microsoft Teams! 🎯✨ 