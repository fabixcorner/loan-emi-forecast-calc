
# Plan: Implement Mobile Responsiveness Fixes (Selected Items Only)

## Overview
Implement 4 specific mobile responsiveness improvements for the EMI Schedule tab as requested:
1. Responsive Tab Triggers
2. Reduce cell padding on mobile
3. Responsive Action Buttons in Header
4. Stack pagination on mobile

---

## Implementation Details

### 1. Responsive Tab Triggers
**File: `src/components/ui/tabs.tsx`** (Line 27)

Update the `TabsTrigger` component styles to use smaller padding and text on mobile screens:

**Current:**
```css
px-8 py-3 text-base
```

**Updated:**
```css
px-4 py-2 text-sm md:px-8 md:py-3 md:text-base
```

This halves the horizontal padding on mobile (32px → 16px) and reduces font size from 16px to 14px.

---

### 2. Reduce Cell Padding on Mobile
**File: `src/components/LoanSummary.tsx`** (Multiple table cells)

Add responsive padding to `TableCell` and `TableHead` components throughout the EMI Schedule table:

**Updates to make:**
- Add `text-xs sm:text-sm` to the Table component for smaller font on mobile
- Table cells already use default padding, but we'll add explicit responsive padding

**Line ~559-572 (Table Headers):**
```tsx
<TableHead className="w-12 font-bold uppercase text-xs sm:text-sm p-2 sm:p-4">×</TableHead>
<TableHead className="w-20 font-bold uppercase text-xs sm:text-sm p-2 sm:p-4">Year</TableHead>
<TableHead className="text-right font-bold uppercase text-xs sm:text-sm p-2 sm:p-4">Principal</TableHead>
// ... apply to all headers
```

**Line ~583-656 (Table Cells):**
Apply `p-2 sm:p-4` to all `TableCell` components for responsive padding.

---

### 3. Responsive Action Buttons in Header
**File: `src/components/LoanSummary.tsx`** (Lines 496-556)

Update the CardHeader to stack buttons on mobile and show icon-only buttons:

**Current (Line 501):**
```tsx
<div className="flex gap-2">
```

**Updated:**
```tsx
<div className="flex gap-1 sm:gap-2 flex-wrap">
```

**Button Updates (Lines 502-554):**
For each button, hide text on mobile and show icons only:

```tsx
<Button variant="outline" size="sm" className="gap-1 sm:gap-2 ...">
  <Share2 className="h-4 w-4" />
  <span className="hidden sm:inline">Share</span>
</Button>
```

Apply the same pattern to:
- Share button
- Full Report button  
- Download button

---

### 4. Stack Pagination on Mobile
**File: `src/components/LoanSummary.tsx`** (Lines 665-810)

Update the pagination container layout to stack vertically on mobile:

**Current (Line 667):**
```tsx
<div className="flex items-center justify-between mt-4 px-2">
```

**Updated:**
```tsx
<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-2">
```

Additionally, hide the "years per page" selector on mobile to save space:

**Line 668:**
```tsx
<div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
```

The navigation controls section (prev/next buttons, page indicators) will remain visible on all screen sizes.

---

## Summary of Files to Modify

| File | Lines | Changes |
|------|-------|---------|
| `src/components/ui/tabs.tsx` | ~27 | Reduce padding/font-size on mobile |
| `src/components/LoanSummary.tsx` | ~559-572 | Add responsive padding to table headers |
| `src/components/LoanSummary.tsx` | ~583-656 | Add responsive padding to table cells |
| `src/components/LoanSummary.tsx` | ~501-554 | Icon-only buttons on mobile |
| `src/components/LoanSummary.tsx` | ~667-688 | Stack pagination, hide years selector on mobile |

---

## Expected Result
- Tabs will be more compact on mobile screens
- Table cells will have reduced padding on mobile
- Action buttons (Share, Full Report, Download) will show only icons on mobile
- Pagination controls will stack vertically on mobile with the years-per-page selector hidden
