# Unified Wizard - Quick Reference

## 🚀 What Was Built

A beautiful, one-page wizard that guides users through creating Events, Areas, Criteria, and Requirements without page navigation.

## 📍 Where to Find It

### User Entry Points:
1. **Home Page** - Green "Quick Setup" button (top right)
2. **Events Page** - Blue "Wizard" button (next to header)
3. **Areas Page** - Blue "Wizard" button (next to header)
4. **Criteria Page** - Blue "Wizard" button (next to header)
5. **Requirements Page** - Blue "Wizard" button (next to header)

## 📂 Files Structure

```
frontend/src/components/
├── UnifiedSetupWizard/
│   ├── UnifiedSetupWizard.jsx      ← Main component
│   └── WIZARD_GUIDE.md              ← User guide
├── Home/
│   └── home.jsx                     ← Modified (added button)
├── Events/
│   └── Events.jsx                   ← Modified (added button)
├── Area/
│   └── Area.jsx                     ← Modified (added button)
├── Criteria/
│   └── Criteria.jsx                 ← Modified (added button)
└── Requirement/
    └── requirement.jsx              ← Modified (added button)

frontend/src/utils/
└── api.js                           ← Modified (added addCriteria)

root/
└── WIZARD_IMPLEMENTATION_SUMMARY.md ← Full documentation
```

## 🎯 The 5-Step Flow

| Step | What | Output |
|------|------|--------|
| 1 | Create Event | EventID |
| 2 | Create Area | AreaID (linked to Event) |
| 3 | Create Criteria | CriteriaID (linked to Event/Area) |
| 4 | Create Requirement | RequirementID (linked to Event/Criteria) |
| 5 | Summary | Review all created items |

## 🎨 UI Elements

**Buttons:**
- Green "Quick Setup" on Home (primary entry)
- Blue "Wizard" on other pages (secondary entry)
- Both use icons for visual clarity

**Progress Tracking:**
- 5-step progress bar at top
- Visual checkmarks for completed steps
- Current step highlighted in blue

**Forms:**
- Clear labels and placeholders
- Red error messages for validation
- Optional field markers
- Required field markers (*)

## 💾 API Integration

### New Method Added:
```javascript
requirementsAPI.addCriteria(data)
```

### Existing Methods Used:
- `eventsAPI.addEvent(data)`
- `areasAPI.addArea(data)`
- `requirementsAPI.addRequirement(data)`

## ✨ Key Features

| Feature | Benefit |
|---------|---------|
| No page switching | Faster workflow |
| Visual progress | User knows where they are |
| Skip steps | Don't create unwanted items |
| Back button | Can fix mistakes |
| Validation | Prevents bad data |
| Success feedback | Confirms actions |
| Auto-linking | Items connected automatically |
| Optional descriptions | Extra context when needed |

## 🔧 Props

```javascript
<UnifiedSetupWizard 
  isOpen={boolean}              // Show/hide wizard
  onClose={function}            // Called when user closes
  onSuccess={function}          // Called after completion
/>
```

## 🎓 Usage Example

```jsx
import UnifiedSetupWizard from "../UnifiedSetupWizard/UnifiedSetupWizard";
import { Wand2 } from "lucide-react";

function MyComponent() {
  const [showWizard, setShowWizard] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setShowWizard(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
      >
        <Wand2 size={18} /> Wizard
      </button>
      
      <UnifiedSetupWizard 
        isOpen={showWizard} 
        onClose={() => setShowWizard(false)}
        onSuccess={() => {
          // Refresh data or update state
        }}
      />
    </>
  );
}
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Wizard won't open | Check `isOpen` prop is true |
| "Next" disabled | Fill required fields (*) |
| API errors | Check backend endpoints exist |
| Data not saving | Check network in DevTools |
| Buttons unresponsive | Wait for `isSubmitting` to finish |

## 📋 Validation Rules

**Event Code:** Required, string, unique
**Event Name:** Required, string
**Area Code:** Required, string, unique per event
**Area Name:** Required, string
**Criteria Code:** Required, string, unique per event
**Criteria Name:** Required, string
**Requirement Code:** Required, string, unique per criteria

## 🌈 Color Scheme

- **Blue (600-700):** Primary actions
- **Green (500-600):** Success feedback
- **Red (500):** Validation errors
- **Gray:** Backgrounds, disabled states, text

## ⌨️ Navigation

| Button | Action |
|--------|--------|
| Next | Create item & move to next step |
| Previous | Go back to edit |
| Skip | Skip current step |
| Finish | Close wizard & refresh data |
| X | Close without saving |

## 📱 Responsive

- Desktop: Full modal (max-width: 2xl)
- Tablet: Responsive width
- Mobile: Full screen with scrolling
- Touch-friendly button sizes

## 🔐 Permissions

- User must be authenticated (JWT token)
- Wizard checks authorization on each API call
- Failed auth redirects to login

## 📊 Data Flow

```
User clicks button
    ↓
Wizard opens (Step 1)
    ↓
User fills Event form
    ↓
User clicks Next
    ↓
API call: addEvent()
    ↓
Success → Show message → Move to Step 2
    ↓
Repeat for Area, Criteria, Requirement
    ↓
Step 5: Show summary
    ↓
User clicks Finish
    ↓
onSuccess callback → Refresh data
    ↓
Modal closes
```

## 📝 Development Notes

1. All API calls are async with try-catch
2. State updates are batched where possible
3. Errors shown in alerts (not ideal - could use toast)
4. Success messages disappear after 1.5 seconds
5. Modal is fully self-contained component
6. No external dependencies beyond lucide-react icons

## 🚀 Performance

- Lazy loads API methods via `import()`
- No heavy computations
- Smooth animations (CSS transitions)
- Minimal re-renders
- Progress indicators use CSS transforms

## 🎯 Next Steps

1. Test wizard in development
2. Get user feedback
3. Deploy to staging
4. User training/documentation
5. Monitor performance
6. Gather feedback for v2

---

**Version:** 1.0
**Status:** Ready for QA
**Last Updated:** January 2, 2026
