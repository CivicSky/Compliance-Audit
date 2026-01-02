# Unified Setup Wizard - Quick Start Guide

## Overview
The **Unified Setup Wizard** is a streamlined, one-page solution for creating Events, Areas, Criteria, and Requirements without switching between multiple pages or modals. It provides a smooth, guided workflow that keeps users engaged on a single interface.

## How to Access the Wizard

### Option 1: From Dashboard
1. Go to **Home/Dashboard**
2. Click the green **"Quick Setup"** button in the top right
3. The wizard modal will open

### Option 2: From Events Page
1. Navigate to **Events** page
2. Click the blue **"Wizard"** button next to the header
3. The wizard modal will open

## How the Wizard Works

The wizard is a **5-step process** with beautiful visual feedback:

### Step 1: Create Event
- Enter **Event Code** (e.g., AUD-2024-001)
- Enter **Event Name** (e.g., Annual Compliance Audit)
- (Optional) Add Description
- Click **Next** - the event is created instantly

### Step 2: Create Area
- Enter **Area Code** (e.g., AREA-001)
- Enter **Area Name** (e.g., Financial Controls)
- (Optional) Add Description
- Click **Next** - the area is created

### Step 3: Create Criteria
- Enter **Criteria Code** (e.g., CRIT-001)
- Enter **Criteria Name** (e.g., Payment Controls)
- (Optional) Select a Parent Criteria if you want to create nested criteria
- (Optional) Add Description
- Click **Next** - the criteria is created

### Step 4: Create Requirement
- Enter **Requirement Code** (e.g., REQ-001)
- (Optional) Add Description
- Click **Next** - the requirement is created

### Step 5: Completion
- Review everything you created
- Click **Finish** to close the wizard
- All items are now in your system

## Key Features

✅ **No Page Switching** - Everything happens in one modal
✅ **Progressive Feedback** - See success messages as you go
✅ **Progress Tracking** - Visual step indicator shows your progress
✅ **Skip Steps** - Don't want to create all items? Use the "Skip" button
✅ **Go Back** - Made a mistake? Click "Previous" to edit earlier steps
✅ **Easy UX** - Large buttons, clear labels, helpful placeholders
✅ **Validation** - Form errors are shown clearly
✅ **Auto-linking** - Each item automatically links to the previous one

## Skipping Steps

If you don't want to create all four items:
1. Fill in what you want
2. Click **Skip** instead of **Next**
3. The wizard will jump to the next step
4. Click **Finish** when done

Example: Create only an Event and Area? 
- Complete Step 1 (Event)
- Complete Step 2 (Area)
- Click Skip at Step 3
- Click Skip at Step 4
- Done! ✓

## Error Handling

If something goes wrong:
- You'll see a red error message
- Fix the issue
- Try again - you won't lose your progress in other steps

## Best Practices

1. **Use Consistent Naming** - Use similar naming conventions for your codes
   - Events: AUD-YYYY-###
   - Areas: AREA-###
   - Criteria: CRIT-###
   - Requirements: REQ-###

2. **Descriptive Names** - Make names clear and descriptive
   - ✓ Good: "Payment Authorization Controls"
   - ✗ Bad: "Controls"

3. **Use Optional Fields** - Add descriptions to help future users understand the items

4. **Create Parent-Child Relationships** - In Step 3, you can link criteria to parent criteria for better organization

## Comparison: Old vs New Flow

### Old Way (Multiple Pages)
1. Navigate to Events page → Add Event
2. Navigate to Areas page → Add Area
3. Navigate to Criteria page → Add Criteria
4. Navigate to Requirements page → Add Requirement
5. **4 page loads + 4 separate interactions**

### New Way (Unified Wizard)
1. Click "Quick Setup" button
2. Fill 4 forms in sequence
3. Click Finish
4. **1 page load + 1 smooth flow**

## Technical Details

The wizard uses:
- **React** for state management
- **Lucide React** for icons
- **Tailwind CSS** for styling
- **API calls** that happen immediately after validation

## Troubleshooting

**Problem: "Next" button won't activate**
- Solution: Check that all required fields (marked with *) are filled

**Problem: Getting error about duplicate codes**
- Solution: Use a unique code for each item - try adding a number suffix

**Problem: Changes not showing after finishing**
- Solution: Refresh the page (F5) to reload data from the server

## Future Enhancements

Potential improvements:
- Bulk import from CSV
- Template-based creation
- Drag-and-drop hierarchy editor
- Keyboard shortcuts
- Mobile optimization

## Support

For issues or suggestions, contact your system administrator.
