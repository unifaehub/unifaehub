# Design System Strategy: Clinical Editorial

This document outlines the visual and behavioral framework for a premium healthcare and education management interface. The objective is to transcend standard SaaS aesthetics in favor of a "Clinical Editorial" experience—merging the precision of a high-end medical journal with the fluidity of modern digital architecture.

## 1. Overview & Creative North Star
**The Creative North Star: "The Clinical Curator"**
The interface is designed to feel like a high-end, bespoke workspace for health professionals. It prioritizes clarity and authority through "Soft Minimalism." Instead of a dense grid of widgets, the design system utilizes intentional asymmetry and tonal depth to guide the eye. We achieve an "editorial" feel by utilizing dramatic white space (negative space) and high-contrast typography scales, ensuring that critical data points (KPIs) breathe and command attention without overwhelming the user.

## 2. Colors: Tonal Architecture
The palette is rooted in the "UNIFAE Care" deep green, but it is applied with restraint to maintain a premium feel.

### The "No-Line" Rule
To create a sophisticated, infinite-canvas feel, **1px solid borders are prohibited** for sectioning. Boundaries must be defined solely through:
*   **Background Shifts:** Use `surface-container-low` (#f2f4f5) sections against a `background` (#f8fafb) to denote sidebar or header regions.
*   **Nesting:** Place a `surface-container-lowest` (#ffffff) card on a `surface-container` (#eceeef) background to provide natural definition.

### Surface Hierarchy & Layering
Treat the UI as a series of physical layers, like stacked sheets of frosted glass:
*   **Base:** `surface` (#f8fafb) - The foundation of the application.
*   **The Content Well:** `surface-container-low` (#f2f4f5) - Used for the main dashboard background.
*   **The Action Layer:** `surface-container-lowest` (#ffffff) - Used for high-priority KPI cards and data tables.

### Glass & Gradient (The Premium Polish)
To move beyond a flat "bootstrap" look:
*   **Floating Elements:** Use `surface` colors at 80% opacity with a `backdrop-blur: 20px` for top bars or context menus.
*   **Signature Textures:** Apply a subtle linear gradient from `primary` (#0d631b) to `primary_container` (#2e7d32) on primary CTAs and active states in the sidebar. This adds a "soul" to the UI that flat hex codes cannot replicate.

## 3. Typography: Authoritative Clarity
The use of **Manrope** provides a geometric yet approachable character. The hierarchy is designed to mimic a high-end editorial layout.

*   **Display & Headlines:** Use `display-md` (2.75rem) for high-level metrics and `headline-sm` (1.5rem) for section titles. These should have a `letter-spacing: -0.02em` to feel tighter and more premium.
*   **Body & Labels:** `body-md` (0.875rem) is our workhorse for data tables. For metadata and helper text, use `label-sm` (0.6875rem) in `on-surface-variant` (#40493d).
*   **Contrast:** Pair `title-lg` (1.375rem) in `on-surface` with `label-md` in `tertiary` (#923357) for "Warning" or "Urgent" educational alerts.

## 4. Elevation & Depth
In this system, depth is a tool for information architecture, not just decoration.

*   **The Layering Principle:** Avoid "Drop Shadows" for static elements. A `surface-container-lowest` card sitting on a `surface-container` background creates a "soft lift" that feels architectural.
*   **Ambient Shadows:** For floating elements (Modals, Dropdowns), use a "Tonal Shadow":
    *   `box-shadow: 0 12px 40px rgba(25, 28, 29, 0.05);` (A 5% tint of `on-surface`).
*   **The "Ghost Border" Fallback:** If a border is required for high-density data tables, use `outline-variant` (#bfcaba) at **15% opacity**. Never use a 100% opaque border.

## 5. Components

### KPI Cards
*   **Style:** `surface-container-lowest` background with a `xl` (0.75rem) corner radius.
*   **Layout:** No divider lines. Use a 24px padding (`spacing-6`) and vertical white space to separate the metric from the trend label.

### Data Tables
*   **Style:** Minimalist. `body-md` for row text.
*   **Separation:** Use `surface-container-low` as a subtle background for the header row. Forbid horizontal lines; use a 4px gap between rows or alternating background tints.
*   **Pagination:** Use "Ghost" buttons (`outline-variant` at low opacity) to keep the focus on the data.

### Buttons & Inputs
*   **Primary Button:** Gradient of `primary` to `primary_container`. Corner radius: `md` (0.375rem).
*   **Input Fields:** `surface-container-highest` background with a `Ghost Border`. Use `label-md` for floating labels that sit above the field, not inside.

### Persistent Sidebar
*   **Style:** `surface-container-low` background. 
*   **Active State:** A vertical pill shape using `primary` with a subtle glow (ambient shadow) to indicate the current section.

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts (e.g., a wide table next to a narrow vertical KPI stack) to create visual interest.
*   **Do** prioritize `Manrope` Medium for titles to maintain an "authoritative" brand voice.
*   **Do** use `tertiary` (#923357) sparingly as a "surgical" accent for critical alerts or educational highlights.

### Don't
*   **Don't** use 100% black text. Always use `on-surface` (#191c1d) to reduce eye strain for health professionals.
*   **Don't** use standard 1px grey dividers (`#CCCCCC`). Use white space or a 2px height shift in background color.
*   **Don't** use "Alert Red" for everything. Use the `error` (#ba1a1a) tokens only for system-critical failures; use `secondary` for neutral status updates.