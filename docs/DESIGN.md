---
name: FMAT Restaurant Design System
colors:
  surface: '#FFFFFF'
  surface-dim: '#F8FAFC'
  surface-bright: '#FFFFFF'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F8FAFC'
  surface-container: '#F1F5F9'
  surface-container-high: '#E2E8F0'
  surface-container-highest: '#E5E7EB'
  on-surface: '#111827'
  on-surface-variant: '#374151'
  outline: '#E5E7EB'
  outline-variant: '#D1D5DB'
  surface-tint: '#C2410C'
  primary: '#C2410C'
  on-primary: '#FFFFFF'
  primary-container: '#FFF7ED'
  on-primary-container: '#9A3412'
  inverse-primary: '#F97316'
  secondary: '#374151'
  on-secondary: '#FFFFFF'
  secondary-container: '#F3F4F6'
  on-secondary-container: '#111827'
  tertiary: '#F97316'
  on-tertiary: '#FFFFFF'
  tertiary-container: '#FFF7ED'
  on-tertiary-container: '#9A3412'
  error: '#DC2626'
  on-error: '#FFFFFF'
  error-container: '#FEF2F2'
  on-error-container: '#991B1B'
  background: '#F8FAFC'
  on-background: '#111827'
  surface-variant: '#F8FAFC'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 4px
  DEFAULT: 8px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
---

# Design System: FMAT Restaurant UI

A unified, minimalist visual component guide designed for restaurant software ecosystems, including point-of-sale (POS) touch interfaces, kitchen order displays (KDS), waiter service terminals, and back-office operations.

**Guiding Principles:** Minimalist · Clear · Consistent · Easy to implement

---

## 1. Visual Theme & Atmosphere

The design language establishes a calm, distraction-free, and highly functional workspace. In high-pressure restaurant service environments, interfaces must be scannable from arm's length, require minimal cognitive effort, and provide unambiguous visual feedback.

Rather than relying on dense decorative cards or competing accent colors, the interface enforces a strict **70 - 20 - 10 visual balance model**:

### The 70 - 20 - 10 Balance Model
* **70% Clean White & Neutral Canvas:** Page canvas (`#F8FAFC`) and card surfaces (`#FFFFFF`). Delivers ample breathing room and eliminates visual noise.
* **20% Structure, Typography & Dividers:** High-contrast headlines in Ink (`#111827`), readable body text in Slate (`#374151`), secondary descriptions in Muted Gray (`#6B7280`), and hairline borders (`#E5E7EB`).
* **10% Focused Orange & Functional States:** Institutional Terracotta Orange (`#C2410C`), Accent Orange (`#F97316`), Soft Selection Tint (`#FFF7ED`), and clear semantic status indicators (Green, Amber, Red, Blue).
* **Core Rule:** **Orange directs user attention.** It is reserved exclusively for the primary call-to-action per block, active row/card selection, and prominent focal points. It must never be applied as a solid background for full cards or used for decorative wallpaper.

---

## 2. Color Palette & Roles

### Base Surfaces & Boundaries
- **Canvas (`#F8FAFC`)**: Page background. A very light, cool neutral gray providing subtle separation behind pure white containers.
- **Surface (`#FFFFFF`)**: Pure white background for cards, modal dialogs, data table containers, and form panels.
- **Border (`#E5E7EB`)**: Structural 1px boundary lines, card borders, table dividers, and default input field strokes.

### Typography Hierarchy
- **Ink (`#111827`)**: Primary titles (H1, H2, H3) and critical monetary totals requiring maximum contrast and instant scannability.
- **Text (`#374151`)**: Standard interface copy, ingredient labels, form field titles, and table text.
- **Muted (`#6B7280`)**: Secondary copy, order modifier instructions, table column metadata, dates, and placeholder hints.

### Primary Brand & Interactive Tokens
- **Primary Terracotta (`#C2410C`)**: Main interactive brand color. Assigned strictly to primary action buttons ("Save changes", "Charge account", "Add"), active toggles, and primary navigation highlights.
- **Hover / Pressed (`#9A3412`)**: Darkened terracotta providing immediate tactile feedback upon hover or tap.
- **Accent Orange (`#F97316`)**: Vibrant orange used for prominent icons, small detail accents, and notification indicators.
- **Soft Orange (`#FFF7ED`)**: Soft luminous tint used as the background fill for selected order cards, active table items, and primary tag containers.

### Semantic Status Colors
Every status is communicated through a distinct colored circular dot paired with explicit, readable label copy:
- **Success (`#16A34A`) / Soft Green (`#F0FDF4`)**: Used for positive states such as "Available", "In stock", "Paid", and successful save confirmations.
- **Warning (`#D97706`) / Soft Amber (`#FFFBEB`)**: Used for cautious operational thresholds such as "Low stock", "Pending", and inventory alerts.
- **Error / Destructive (`#DC2626`) / Soft Red (`#FEF2F2`)**: Used for blocking conditions like "Out of stock", payment processing failures, validation errors, and the destructive "Delete" action.
- **Information (`#2563EB`) / Soft Blue (`#EFF6FF`)**: Used for ongoing operations like "Syncing changes..." and informational system notes.
- **Selected State**: Outlined with a 1–2px `#C2410C` border over a `#FFF7ED` soft background fill.

---

## 3. Typography Rules

**Primary Typeface:** `Inter`  
**System Fallback:** `system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`

Typography maintains strict scale discipline, using uniform line heights and clean sans-serif geometry to guarantee legibility across screen sizes.

### Typographic Scale
- **H1 · Screen Title:** `28px` / Line-height: `36px` | Weight: `700 (Bold)` | Color: `#111827`. Designates the overarching screen view (e.g., "Catalog", "Sales Overview").
- **H2 · Section Title:** `22px` / Line-height: `30px` | Weight: `700 (Bold)` | Color: `#111827`. Major visual block headers (e.g., "Products", "Orders", "Check #1234").
- **H3 · Component & Card Header:** `18px` / Line-height: `26px` | Weight: `600 (Semi-Bold)` | Color: `#111827`. Identifies individual cards (e.g., "Classic Burger", "Table 04").
- **Body · Main Interface Text:** `16px` / Line-height: `24px` | Weight: `400 (Regular)` | Color: `#374151`. Product descriptions, table row values, and input text.
- **Small · Auxiliary Text & Labels:** `14px` / Line-height: `20px` | Weight: `400 (Regular)` or `500 (Medium)` | Color: `#6B7280`. Form field labels, modifier notes, timestamps, and status chips.
- **Caption · Micro Metadata:** `12px` / Line-height: `16px` | Weight: `400 (Regular)` | Color: `#6B7280`. Footnotes, sub-timestamps, and fine print.

### Typographic Discipline
- Weight `400` is used for body copy and general reading.
- Weights `600` and `700` are reserved for structural headings, active tabs, and primary metrics.
- Financial figures and currency amounts are always styled in bold or semi-bold and aligned to the right.

---

## 4. Component Stylings & Interaction Patterns

### 4.1 Buttons
*Consistent height, uniform 8px corner radius, and exactly one primary action per visual block.*
- **Primary (`#C2410C`):** Solid terracotta orange fill, white text (`#FFFFFF`). Hover state: `#9A3412`. Placed on the right side of action groups ("Save changes", "Charge account").
- **Secondary:** Pure white surface (`#FFFFFF`), subtle 1px border (`#E5E7EB` or `#C2410C`), dark/orange text. Visible alternative actions ("Preview", "Filter").
- **Tertiary / Cancel:** Transparent background, muted gray text (`#6B7280`). Positioned to the left of the primary action ("Cancel").
- **Destructive (`#DC2626`):** Solid crimson red fill, white text. Reserved strictly for irreversible actions ("Delete").
- **Disabled:** Soft gray background (`#F3F4F6`), muted text (`#9CA3AF`), cursor `not-allowed`.
- **Button Sizes:**
  - **SM (32px):** Compact filters and inline table actions.
  - **MD (40px):** Standard toolbar buttons and form controls.
  - **LG (48px):** High-touch primary POS actions ("Charge account", "Send to kitchen").
- **Icon-Only Buttons:** Minimum hit target of `40 × 40 px` with centered 16–20px icon.
- **Copywriting Syntax:** `Verb + Object` formula (e.g., "Charge account", "Save changes", "Add product" rather than generic "Accept" or "OK").
- **Interaction Rule:** Primary on the right · Cancel on the left · Loading state prevents double tap · Red strictly reserved for delete/cancel.

### 4.2 Inputs & Forms
*Always visible labels, brief helper text, and error messages positioned directly beneath the field.*
- **Labels:** Positioned above the field in semi-bold Slate (`#374151`). Never replace labels with placeholders.
- **Input Fields:** 40px standard height (48px for touch), white background, 1px `#E5E7EB` border, 8px corner radius.
- **Focus State:** 2px solid `#C2410C` border with subtle outline ring.
- **Error State:** 2px solid `#DC2626` border with immediate red helper text below ("Enter a value greater than 0.").
- **Disabled State:** Light gray fill (`#F3F4F6`), muted text (`#9CA3AF`), marked read-only.
- **Selection Controls:**
  - Checkbox: Square with rounded 4px corners; filled in `#C2410C` with a white checkmark when active.
  - Radio Button: Concentric circular indicator in `#C2410C` when selected.
  - Toggle Switch: Track turns `#C2410C` when active; neutral gray `#E5E7EB` when inactive.
- **Search & Select:**
  - Search field features an integrated magnifying glass icon on the left.
  - Dropdown select includes a subtle downward chevron icon on the right.

### 4.3 Cards & Modular Containers
*Crisp 1px `#E5E7EB` border, whisper-soft shadow, and content-driven hierarchy. Lateral decorative color stripes are forbidden.*
- **Product Card:**
  - Top visual area for dish photograph or clean vector illustration.
  - Status chip pinned to upper corner ("● Available" in green).
  - Prominent H3 title (`#111827`) and brief description (`#6B7280`).
  - Bold price display (`$145.00`).
  - Full-width or right-aligned "Add" button at the base.
- **Selectable Order Card:**
  - Header with order identifier ("Order #2035") and status tag ("● Paid" or "● Pending").
  - Subtitle with table and party size ("Table 20 · 4 guests").
  - Total monetary value right-aligned ("$230.00").
  - **Selected State:** Switches to Soft Orange background (`#FFF7ED`) with a 2px `#C2410C` perimeter stroke.
- **Summary KPI Card:**
  - White surface with fine 1px border.
  - Header label ("TODAY'S SALES", "ORDERS").
  - Large H1 numerical metric (`$12,480`, `48`).
  - Trend variation or subtext ("+8.4%", "12 pending") with quick action link ("View orders").
- **Horizontal Card:**
  - Compact horizontal layout: left thumbnail, title, quantity ("Quantity: 2"), price ("$236.00"), and 3-dot overflow menu.

### 4.4 Shell, Navigation & Filtering
*Unified application shell where navigation is shared and individual modules supply content.*
- **Topbar:** Dark (`#111827`) or white bar featuring brand mark and quick search bar ("Search product").
- **Sidebar Navigation:**
  - **Compact Variant:** 48–56px wide icon-only rail for high-density tablet views.
  - **Expanded Variant:** Icon + descriptive label ("Home", "Catalog", "Orders", "Users").
  - Active item highlighted with Soft Orange fill (`#FFF7ED`) and Terracotta icon/text (`#C2410C`).
- **Breadcrumbs:** Scannable navigation trail: `Home / Inventory / Products`.
- **Category Filter Tabs:** Horizontal segmented tabs ("All", "Available", "Out of stock"). Active tab displays semi-bold text with a solid 2px bottom accent indicator in `#C2410C`.
- **Pagination:** Numbered button cluster (1, 2, 3, 4, 5). Active page highlighted with solid `#C2410C` fill and white text.

### 4.5 Data Tables & Compact Lists
*Light borders, right-aligned numbers, and secondary actions grouped inside dropdown menus.*
- **Header:** Light neutral background (`#F8FAFC`), semi-bold labels, integrated search bar ("Search ingredient") and "+ Add" button.
- **Alignment:** Names and categories align left; quantities, units, and monetary prices align right.
- **Stock Badges:** "● In stock" (Green), "● Low stock" (Amber), "● Out of stock" (Red).
- **Row Actions:** Three-dot menu (`...`) at the right of each row for secondary commands (Edit, Deactivate).
- **Mobile Transformation:** Tables collapse automatically into compact scannable cards on mobile viewports.

### 4.6 System Feedback, Empty States & Modals
*The user always knows what happened and what can be done next.*
- **Feedback Banners / Toasts:**
  - Success: "● Product saved successfully." (fill: `#F0FDF4`, border: `#BBF7D0`).
  - Warning: "● 4 units remaining in inventory." (fill: `#FFFBEB`, border: `#FDE68A`).
  - Error: "● Could not process payment." (fill: `#FEF2F2`, border: `#FECACA`).
  - Info: "● Syncing changes..." (fill: `#EFF6FF`, border: `#BFDBFE`).
- **Empty State:**
  - Minimal circular outline icon.
  - Clear H3 headline: "No products yet".
  - Guidance subtitle: "Add the first product to get started".
  - Dedicated primary CTA: "+ Add product".
- **Confirmation Modal:**
  - Centered dialog container over dark backdrop overlay (`rgba(17, 24, 39, 0.4)`).
  - H2 title: "Confirm deletion".
  - Explanatory copy: "“Classic Burger” will be deleted. This action cannot be undone."
  - Highlighted warning banner: "Review the product before continuing."
  - Action buttons: "Cancel" (tertiary on left) and "Delete" (solid destructive red on right).

### 4.7 Restaurant Operational Patterns
Reusable interface patterns engineered for restaurant floor operations:
- **Table Card:**
  - Status chip: "● Occupied" (Amber) or "● Available" (Green).
  - Identifier: "Table 04".
  - Operational details: "4 guests · 32 min" or "Capacity: 4 guests".
  - Action button: Secondary "View table".
- **Kitchen Order Ticket (KDS):**
  - High-contrast header banner: "TABLE 04 · #184 12:41".
  - Ordered items list with bold quantities (e.g., `2 Classic Burger`, `1 House Salad`, `3 Mineral Water`).
  - Cooking notes and customer modifiers in muted text (`No onion · Medium rare`, `Dressing on the side`).
  - Primary bottom CTA: "Mark as ready" (`#C2410C`).
- **Check / Receipt Panel (POS Checkout):**
  - Receipt header: "Check #1234", "Table 04 · 22/09/2026 · 18:45".
  - Line items: `2 × Classic Burger $290.00`, `1 × House Salad $118.00`, `3 × Mineral Water $90.00`.
  - Prominent financial total in H2: "Total $498.00".
  - Full-width touch CTA: "Charge account" / "Pay check" (48px height, `#C2410C`).

---

## 5. Spacing, Geometry & Radii

### Modular Spacing Scale
All spatial increments are multiples of the **4px base unit (`--space-unit: 4px`)**:
- `4px`: Micro spacing (gap between inline status dot and text, internal badge padding).
- `8px`: Compact spacing (gap between form label and input, tight control margins).
- `12px`: Element stack spacing (vertical distance between form rows).
- `16px`: Standard spacing (card grid gutters, internal card padding).
- `24px`: Canvas margin (outer screen margins, structural module gaps).
- `32px` & `48px`: Major section gutters, modal dialog margins.

### Corner Radii Hierarchy
- **4px (`--radius-sm`)**: Status badges, compact tags, and chips.
- **8px (`--radius-control: 8px`)**: Interactive buttons, input fields, selects, and filter chips.
- **12px (`--radius-card: 12px`)**: Product cards, order tickets, modals, and panel containers.

### Touch Ergonomics & Hit Targets
- **40px (`h-10`)**: Standard control height for mouse/pointer navigation.
- **48px (`h-12`)**: Recommended control height for touch and POS terminals (exceeding the 44px minimum tap target).
- **40 × 40 px**: Absolute minimum boundary for icon-only touch buttons.

### Elevation & Depth
- Primarily flat aesthetic. Shadows are used sparingly to separate overlapping layers (`box-shadow: 0 1px 3px rgba(0,0,0,0.05)`). Modales utilize soft diffused ambient drop shadows (`box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1)`). Neon halos, saturated glows, and backdrop blurs are prohibited.

---

## 6. Responsive Architecture

Components rearrange across viewports without shrinking into illegibility:
- **Desktop (`≥ 1200 px` · 12-Column Grid):**
  - Full experience with expanded sidebar.
  - Workspace displays a 3 to 4 column card grid.
- **Tablet Landscape (`768–1199 px` · 8-Column Grid) — POS Standard:**
  - Compact icon-only left sidebar (48–56px).
  - 2-column workspace (e.g., active orders list on left, receipt breakdown on right).
  - Touch-friendly 48px controls.
- **Mobile (`< 768 px` · 4-Column Grid):**
  - Single stacked column layout.
  - Sidebar collapses into a sticky bottom navigation bar.
  - Wide data tables transform into compact vertical card lists.

---

## 7. Anti-Patterns & Banned AI Practices

### Banned Practices (Never Do)
- **NEVER** invent alternative shades of orange or customize button border radii to pill shapes (`rounded-full` on primary buttons is forbidden).
- **NEVER** paint vertical colored stripes along the edges of cards.
- **NEVER** fill entire card backgrounds with orange or use orange as decorative screen wallpaper.
- **NEVER** use red as a primary brand color; red is strictly reserved for destructive deletion and error states.
- **NEVER** hide form input labels inside placeholder text.
- **NEVER** duplicate topbars, sidebars, or global wrapper elements inside inner view modules.
- **NEVER** add decorative neon drop shadows, radial gradients, or AI-generated visual clutter.
- **NEVER** fabricate dummy uptime percentages, simulated server response times, or fake analytics not provided in specifications.

### Pre-Delivery Checklist
- [x] Shared components and tokens strictly reused
- [x] Loading (skeleton), empty, and error states defined
- [x] Visible focus rings and accessible keyboard navigation
- [x] Touch targets comply with minimum 44–48 px sizing
- [x] No global style bleed
- [x] Responsive verified across Desktop, Tablet, and Mobile
