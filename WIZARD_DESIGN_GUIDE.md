# Unified Wizard - Visual Design Guide

## 📐 Component Layout

### Modal Structure
```
┌─────────────────────────────────────────────────┐
│ ╔═════════════════════════════════════════════╗ │
│ ║  Complete Setup Wizard              ✕       ║ │
│ ╚═════════════════════════════════════════════╝ │
│ ┌─────────────────────────────────────────────┐ │
│ │ [1] ─── 2 ─── 3 ─── 4 ─── 5              │ │
│ │      Progress Bar                         │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Event  | Area  | Criteria | Requirement   │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │  Step Content                              │ │
│ │  (Form Fields, Inputs, Descriptions)      │ │
│ │                                             │ │
│ │                                             │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │  [◄ Previous] [Skip] [Next ►]             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## 🎨 Color Palette

### Primary Colors
```
Blue (Primary Actions)
├─ #2563EB (bg-blue-600)    ← Normal state
└─ #1D4ED8 (bg-blue-700)    ← Hover state

Green (Success Feedback)
├─ #10B981 (text-green-600) ← Success message
└─ #059669 (bg-green-600)   ← Success button

Red (Errors)
└─ #EF4444 (text-red-500)   ← Error messages

Gray (Neutrals)
├─ #F3F4F6 (bg-gray-100)    ← Backgrounds
├─ #E5E7EB (bg-gray-200)    ← Borders
├─ #6B7280 (text-gray-500)  ← Secondary text
└─ #1F2937 (text-gray-800)  ← Primary text
```

### State Colors
```
Active/Current Step    → Blue (#2563EB)
Completed Step         → Green (#10B981)
Not Started Step       → Gray (#D1D5DB)
Error State           → Red (#EF4444)
Success Message       → Green (#10B981)
Disabled Button       → Gray (#D1D5DB)
Hover Button          → Darker shade
```

## 📏 Spacing & Sizing

### Modal Dimensions
```
Desktop:
├─ Width: max-w-2xl (672px)
├─ Height: max-h-[90vh] (responsive)
└─ Max-width on ultrawide: auto with max

Mobile:
├─ Width: full with p-4 (16px margin)
├─ Height: full screen with scroll
└─ Responsive padding
```

### Component Spacing
```
Header:              p-6 (24px)
Progress Bar:        py-4 px-6 (16px vertical, 24px horizontal)
Step Labels:         py-3 px-6 (12px vertical, 24px horizontal)
Content Area:        p-6 (24px all sides)
Footer:              py-4 px-6 (16px vertical, 24px horizontal)

Form Fields:
├─ Label to Field:   mb-2 (8px)
├─ Field Height:     py-2 px-4 (8px vertical, 16px horizontal)
├─ Between Fields:   space-y-4 (16px)
└─ Textarea:         rows-3 to rows-4 (3-4 line height)

Buttons:
├─ Padding:          px-4 py-2 or px-6 py-2
├─ Border Radius:    rounded-lg (8px)
├─ Gap Between:      gap-3 (12px)
└─ Font:             font-semibold
```

## 🔤 Typography

### Font Stack
```
Body:           -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
Fallback:       ui-sans-serif, system-ui, sans-serif

Sizes Used:
├─ Modal Title:           text-2xl, font-bold       (24px, bold)
├─ Step Title:            text-xl, font-bold        (20px, bold)
├─ Form Labels:           text-sm, font-semibold    (14px, semibold)
├─ Placeholder Text:      text-sm                   (14px, normal)
├─ Success Messages:      text-sm                   (14px, normal)
├─ Error Messages:        text-sm                   (14px, normal)
├─ Step Numbers:          text-xs, font-bold        (12px, bold)
└─ Button Text:           font-semibold             (normal, semibold)
```

## 🎯 Component States

### Buttons

**Primary Button (Next)**
```
Normal:  bg-blue-600 text-white hover:bg-blue-700 transition
Hover:   bg-blue-700 shadow-lg transform scale-105
Active:  bg-blue-800
Loading: bg-blue-400 disabled cursor-not-allowed
Disabled: bg-blue-400 disabled cursor-not-allowed
```

**Secondary Button (Previous)**
```
Normal:  bg-gray-300 text-gray-800 hover:bg-gray-400
Hover:   bg-gray-400 transition
Disabled: bg-gray-200 text-gray-500 cursor-not-allowed
```

**Tertiary Button (Skip/Finish)**
```
Skip:    bg-gray-400 text-white hover:bg-gray-500
Finish:  bg-green-600 text-white hover:bg-green-700
```

### Form Fields

**Input (Normal)**
```
Border:      border border-gray-300 rounded-lg
Focus:       ring-2 ring-blue-500 outline-none
Filled:      bg-white
Placeholder: text-gray-400
Text:        text-gray-700
```

**Input (Error)**
```
Border:      border border-red-500 rounded-lg
Focus:       ring-2 ring-red-500 outline-none
Background:  bg-red-50
Text:        text-red-700
```

**Input (Disabled)**
```
Border:      border border-gray-300 rounded-lg
Background:  bg-gray-100
Text:        text-gray-400
Cursor:      not-allowed
```

### Progress Steps

**Not Started (Gray)**
```
Circle:    w-10 h-10 bg-gray-300
Text:      text-gray-600 font-bold
Line:      bg-gray-300
```

**Current/Active (Blue)**
```
Circle:    w-10 h-10 bg-blue-600
Text:      text-white font-bold
Icon:      (step number)
Line:      bg-gray-300
```

**Completed (Green)**
```
Circle:    w-10 h-10 bg-green-500
Text:      text-white
Icon:      Check mark (✓)
Line:      bg-green-500
```

## 🎬 Animations & Transitions

### Transitions
```
Default:     transition (all 150ms cubic-bezier)
Duration:    duration-200 (for slower transitions)
Easing:      ease-in-out

Applied to:
├─ Hover effects on buttons
├─ Focus states on inputs
├─ Background color changes
└─ Shadow changes
```

### Transform Effects
```
Hover Button:
├─ transform hover:scale-105  (5% larger)
└─ shadow-lg                  (larger shadow)

Active Button:
└─ no additional transform

Loading State:
└─ opacity-50 (semi-transparent)
```

### Appearance
```
Success Message:
├─ animate-in             (fade in)
├─ duration-300
└─ Auto-disappears after 1.5s

Modal:
├─ Appears instantly
├─ Fixed overlay behind
└─ Smooth transitions on state changes
```

## 🖼️ Icons

### Icon Set: Lucide React
```
Size Chart:
├─ Close (X):              size={24}
├─ Navigation (Chevrons):  size={20}
├─ Check/Checkmark:        size={20} (in steps), size={48} (completion)
├─ Wand (Wizard):          size={18} (button), size={20} (label)
└─ Other:                  size={18-24} contextual

Usage:
├─ Navigation buttons:  display with button text
├─ Form fields:         no icons (clean look)
├─ Progress:            in circle indicators
├─ Success/Error:       inline with message
└─ State indicators:    ✓ or ✕ characters
```

## 📱 Responsive Breakpoints

### Desktop (lg: 1024px+)
```
Modal:          w-full max-w-2xl (672px)
Padding:        p-6 (24px)
Grid:           grid-cols-5 for progress
Font Sizes:     Full sizes
Buttons:        Full size with text
```

### Tablet (md: 768px)
```
Modal:          w-full mx-4
Padding:        p-4 (16px)
Grid:           Responsive
Font Sizes:     Slightly reduced
Buttons:        Medium size
```

### Mobile (< 768px)
```
Modal:          w-full mx-4 max-h-[90vh]
Padding:        p-4 (16px)
Grid:           Single column for labels
Font Sizes:     Reduced (text-xs, text-sm)
Buttons:        Full width, larger touch area (py-3)
Layout:         Stack vertically
Overflow:       Scrollable
```

## 📊 Visual Hierarchy

### Priority Order
```
1. Modal Title (24px, bold)
   └─ "Complete Setup Wizard"

2. Current Step Title (20px, bold)
   └─ "Step 1: Create Event"

3. Form Labels (14px, semibold)
   └─ "Event Code *"

4. Help Text (14px, normal)
   └─ "e.g., AUD-2024-001"

5. Form Fields (14px)
   └─ Input boxes

6. Error Messages (14px, red)
   └─ "Event code is required"

7. Footer Buttons (14px, semibold)
   └─ "Previous", "Next", etc.
```

## 🎨 Component Layering (z-index)

```
Backdrop:          z-50 (backdrop filter)
Modal Container:   z-50 (fixed position)
Modal Content:     z-auto (inside modal)
Dropdowns:         z-auto (inside modal)
Focus Ring:        Default (automatically on top)
```

## ✨ Special Effects

### Success Message Box
```
Background:    bg-green-50
Border-Left:   border-l-4 border-green-500
Border-Radius: rounded
Padding:       p-4
Text Color:    text-green-700
Animation:     animate-in (fade + slide)
```

### Error Message Text
```
Color:         text-red-500
Font:          text-sm
Margin-Top:    mt-1
Position:      Below input field
```

### Disabled State
```
Button:
├─ Opacity:      50%
├─ Cursor:       not-allowed
└─ No hover effects

Input:
├─ Background:   bg-gray-100
├─ Text:         text-gray-400
└─ Cursor:       not-allowed
```

## 🎯 Focus Management

### Keyboard Navigation
```
Tab Order:
1. Step inputs (top to bottom)
2. Dropdowns/selects
3. Previous button
4. Skip button
5. Next/Finish button
6. Close (X) button

Focus Outline:
├─ Visible focus ring (ring-2 ring-blue-500)
├─ High contrast
└─ At least 2px outline
```

## 📐 Grid Layout

### Progress Bar
```
5 columns with gap-4:
├─ Step 1 (flex-1, center)
├─ Divider (flex-1)
├─ Step 2
├─ Divider
├─ Step 3
├─ Divider
├─ Step 4
├─ Divider
└─ Step 5
```

### Step Labels
```
5 equal columns:
├─ text-xs
├─ text-center
├─ font-semibold
└─ text-gray-700
```

### Footer Buttons
```
Flex with justify-between:
├─ Left: Previous button
├─ Center: Space (flex-1)
└─ Right: Skip + Next buttons (flex items-center gap-3)
```

## 🎓 Design System Tokens

### Spacing Scale
```
0:   0px
1:   4px
2:   8px
3:   12px
4:   16px
5:   20px
6:   24px
8:   32px
12:  48px
```

### Border Radius
```
sm:  4px
md:  6px
lg:  8px
xl:  12px
2xl: 16px
full: 50%
```

### Shadows
```
sm:  0 1px 2px 0 rgba(0, 0, 0, 0.05)
md:  0 4px 6px -1px rgba(0, 0, 0, 0.1)
lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1)
xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

---

## Implementation Checklist

- [x] Header with gradient background
- [x] Progress bar with 5 steps
- [x] Step labels for each phase
- [x] Form content area
- [x] Success message notifications
- [x] Form validation styling
- [x] Responsive layout
- [x] Button states (normal, hover, disabled)
- [x] Icon usage
- [x] Accessibility standards
- [x] Mobile optimizations
- [x] Smooth transitions
- [x] Error messaging
- [x] Focus management

---

**Design Version:** 1.0
**Last Updated:** January 2, 2026
**Framework:** Tailwind CSS
**Icons:** Lucide React
