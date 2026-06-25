# Location filter bar redesign

## Problem

The neighborhood filter (labeled "location" by the user) currently renders as a
row of independent multi-select pills, sharing a single Clear button with the
tag filters. The desired interaction is single-select: pick one location,
switching directly between locations without an explicit clear step, and tap
the active one again to return to "all locations." The shared Clear button
should be scoped to tags only and moved to sit with them.

## Visual design

Replace the neighborhood pill row in `FilterBar.astro` with a single bar:

- **Shape**: one continuous track, fully rounded only at the two outer ends
  (`border-radius: 999px` on the container). Segments are flush against each
  other (divided-segments style), separated by `2px solid #c4b5fd` dividers,
  with the same `2px solid #c4b5fd` as the track's outer border.
- **Idle segment**: `#f9f5ff` background (existing track color), `#6d28d9`
  text, font-weight 700, system-ui font stack
  (`system-ui, -apple-system, "Segoe UI", sans-serif`), ~0.82rem. Subtle
  raised bevel via `box-shadow: inset 1px 1px 0 rgba(255,255,255,0.6), inset -1px -1px 0 rgba(124,58,237,0.15)`
  on the segment, echoing the topbar nav buttons' bevel treatment.
- **Active segment**: `#c4b5fd` background, `#4c1d95` text, pressed-in bevel
  via `box-shadow: inset 1px 1px 0 rgba(0,0,0,0.1), inset -1px -1px 0 rgba(255,255,255,0.4)`.
- **Text alignment**: centered both horizontally and vertically within each
  segment (flex `align-items: center; justify-content: center`).
- **No icons/emoji** in the bar.
- **No dedicated "All" segment** — when no segment is active, all locations
  show; this is the default/reset state.
- **Overflow**: on narrow viewports where segments don't fit one line, the
  bar scrolls horizontally (`overflow-x: auto`, segments `white-space: nowrap`,
  `flex: 0 0 auto`) rather than wrapping to multiple rows, preserving the
  single continuous bar look at all widths.

## Selection behavior

Location selection becomes single-select (XOR), mirroring the existing
category pill behavior in `Base.astro`:

- Tapping an inactive location deactivates any other active location and
  activates the tapped one (XOR), via a new `setNeighborhood(slug)` function
  modeled on the existing `setCategory(slug)`.
- Tapping the currently active location deactivates it via the existing
  `deactivateFilter(slug)` path, returning to the "all locations" state.
- `activeNeighborhoods` remains a `Set`, but will only ever contain 0 or 1
  entries after this change.

## Clear button

- Moves in the markup to sit next to the tag pills row instead of above the
  neighborhood bar.
- Scope narrows to tags only: the click handler clears `activeTags` only (no
  longer touches `activeNeighborhoods`), and `updateClearBtn()`'s
  disabled-state check considers only `activeTags.size === 0`.
- Label and visual treatment (`✕ Clear`, disabled styling) stay unchanged.

## Out of scope / unaffected

- **Routing**: `src/pages/[...filters].astro` already only ever generates a
  single neighborhood per URL combination (`cat/neighborhood`), so no changes
  are needed to `getStaticPaths` or URL building (`buildUrl()` already just
  spreads `activeNeighborhoods`, which will now only ever have 0-1 entries).
- **Availability graying**: the existing `wouldHaveResults` /
  `updatePillAvailability` logic (graying out a segment if selecting it would
  produce zero results) is unaffected and continues to apply to location
  segments and tag pills.
- **Tags**: tag pill styling, multi-select behavior, and layout are unchanged
  apart from the Clear button now living in that row.

## Files touched

- `src/components/FilterBar.astro` — markup + CSS for the new location bar;
  move the `#filterClear` button into the tags section.
- `src/layouts/Base.astro` — add `setNeighborhood`, update click handler to
  treat `neighborhood` type like `category` (XOR-activate), scope
  `updateClearBtn` and the Clear click handler to tags only.
- `src/styles/theme.css` (filter styles live here, lines 432-517) — new
  `.location-bar` / `.location-segment` rules, remove now-unused
  `.filter-pills--neighborhoods` rules.
