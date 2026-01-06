# Event Selection Flow - Implementation Summary

## Overview
The UnifiedSetupWizard now includes a **Step 0: Event Selection** feature that allows users to either create a new event or select an existing event before proceeding to add areas, criteria, and requirements.

## Updated Flow Structure

### 6-Step Process (was 5-step):

```
Step 0: Select Event (NEW)
  ↓
Step 1: Create Event (optional - only if "Create New" selected)
  ↓
Step 2: Create Area
  ↓
Step 3: Create Criteria
  ↓
Step 4: Create Requirement
  ↓
Step 5: Complete & Summary
```

## Step 0: Event Selection UI

### User Choices:
1. **Create New Event** (Plus icon)
   - Shows event creation form inline
   - Fields: Event Code, Event Name, Description
   - Proceeds to Step 1 → then to Step 2 (Area)

2. **Select Existing Event** (Wand2 icon)
   - Shows dropdown of available events
   - Dropdown populated from API: `eventsAPI.getAllEvents()`
   - Proceeds directly to Step 2 (Area) - skips event creation

### Visual Design:
- Two clickable cards with icons
- Active card has blue border and background
- Card shows icon + title + description
- Form appears below based on selected mode
- Responsive grid layout

## State Management Changes

### New State Variables:
```javascript
const [eventMode, setEventMode] = useState(null); // null | 'create' | 'select'
const [availableEvents, setAvailableEvents] = useState([]);
```

### State Initialization:
- `eventMode` reset to `null` when modal opens
- `currentStep` starts at `0` (was `1`)
- `availableEvents` fetched via `fetchEvents()` on modal open

### Event Data Structure:
```javascript
{
  EventId: number,        // Set when selecting existing event
  EventCode: string,      // Entered by user or from selection
  EventName: string,      // Entered by user or from selection
  Description: string     // Optional
}
```

## Navigation Flow

### handleNext() Logic:

**At Step 0:**
```javascript
if (currentStep === 0 && eventMode === null) {
  // Show error - user must select a mode
} else if (currentStep === 0 && eventMode === 'create') {
  setCurrentStep(1);  // Go to event creation form
} else if (currentStep === 0 && eventMode === 'select') {
  if (!eventData.EventId) {
    // Show error - user must select an event
  } else {
    setCurrentStep(2);  // Skip event form, go directly to area
  }
} else if (currentStep === 1 && eventMode === 'create') {
  // Create event and move to step 2
  handleAddEvent();  // Modified to transition to step 2
  setCurrentStep(2);
} else {
  // Steps 2, 3, 4, 5 - normal progression
  setCurrentStep(currentStep + 1);
}
```

### Button Behavior:

- **Previous Button:**
  - Disabled at Step 0
  - Navigates backwards one step

- **Skip Button:**
  - Only available at Steps 2, 3, 4 (not 0, 1, or 5)
  - Allows skipping optional sub-items

- **Next Button:**
  - Available at all steps
  - Text changes to "Finish" at Step 5

## API Integration

### fetchEvents():
```javascript
const fetchEvents = async () => {
  try {
    const response = await eventsAPI.getAllEvents();
    setAvailableEvents(response || []);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    setAvailableEvents([]);
  }
};
```

### Called On:
- Modal open (`isOpen` dependency in useEffect)
- Before user sees Step 0

## Form Visibility

### Step 1 (Event Creation):
```javascript
{currentStep === 1 && eventMode === 'create' && (
  // Show event creation form
)}
```
- Only shown if user selected "Create New Event"
- Hidden if user selected "Select Existing Event"

### Steps 2-5:
```javascript
{currentStep === 2 && (   // Area
{currentStep === 3 && (   // Criteria
{currentStep === 4 && (   // Requirement
{currentStep === 5 && (   // Summary
```
- Display normally regardless of event mode
- All use the selected/created event data

## Progress Bar Updates

- Now displays 6 steps instead of 5
- Step 0 circle hidden from visual progress (too many would be cluttered)
- Labels shown: "Select | Event | Area | Criteria | Requirement | Complete"
- All completed steps still show checkmarks

## User Experience Scenarios

### Scenario 1: Create New Event + Add Items
1. Opens modal → sees Step 0
2. Selects "Create New Event"
3. Enters event details → clicks Next
4. Proceeds through Steps 2-5 to add Area, Criteria, Requirement

### Scenario 2: Select Existing Event + Add Items
1. Opens modal → sees Step 0
2. Selects "Select Existing Event"
3. Chooses event from dropdown → clicks Next
4. Jumps directly to Step 2 (Area)
5. Proceeds through Steps 3-5 to add Criteria, Requirement

### Scenario 3: No Events Available
- Dropdown shows message: "No events available. Please create a new event first."
- User must select "Create New Event" to proceed

## Error Handling

- Step 0 validation:
  - `eventMode` must be selected (not null)
  - If "select": `eventData.EventId` must be populated
  - If "create": Same validations as Step 1

- Messages shown in form validation errors

## Files Modified

1. **UnifiedSetupWizard.jsx** (893 lines)
   - Added `eventMode` and `availableEvents` state
   - Added `fetchEvents()` function
   - Added Step 0 JSX with event selection UI
   - Updated `handleNext()` for event selection logic
   - Updated button conditions
   - Updated progress bar to 6 steps

2. **Previous Session Files** (already integrated)
   - Home.jsx, Events.jsx, Area.jsx, Criteria.jsx, requirement.jsx
   - api.js with updated methods

## Benefits

✅ Users can now add items to existing events without re-creating them
✅ Follows hierarchical data structure (Event → Area → Criteria → Requirement)
✅ Matches modal interaction patterns used elsewhere in app
✅ Reduces data duplication
✅ More flexible workflow for different use cases
