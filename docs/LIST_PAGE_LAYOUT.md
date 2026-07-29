# List Page Layout — Standard Pattern

## Problem Being Solved

List pages show a scrollable data table that should fill the remaining viewport height
with no page-level scrollbar. These pages all share the same chrome:

```
┌────────────────────────────────────┐  ← fixed footer (position:fixed)
│  Nav header                        │  flex-shrink: 0
│  Page title + Add button           │  flex-shrink: 0
│  Filter bar                        │  flex-shrink: 0
│  ┌──────────────────────────────┐  │
│  │  Scrollable table            │  │  flex: 1, overflow-y: auto
│  │  …                           │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

Without the pattern pages either:

- Page-scroll instead of table-scroll (`documents` before fix — no flex on body)
- Don't use the full viewport height (`inputs` — `padding-bottom:60px` on body + fragile `max-height:calc(100vh-240px)`)
- Have layout details scattered across inline HTML styles and JS `style.*` assignments

---

## The CSS Classes

### `body.list-page`

Apply to every list/table page's `<body>`.

```css
body.list-page {
  display: flex;
  flex-direction: column;
  height: 100dvh; /* dvh handles mobile browser chrome correctly */
  overflow: hidden; /* prevents page-level scrollbar */
}
```

### `.filter-bar`

Apply to any element that sits between the heading row and `<main>`.

```css
.filter-bar {
  flex-shrink: 0; /* never shrinks under table pressure */
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0 0.5rem 0.25rem;
  padding: 0.25rem 0;
}
```

Labels and inputs inside `.filter-bar` inherit compact sizing
(`font-size: 0.75rem`, `height: 24px`).

### `body.list-page #main` (override of global `#main`)

The global `#main` rule uses `display: block` with `padding-bottom: 80px` for
non-list pages. `body.list-page #main` overrides to a flex column container.

```css
body.list-page #main {
  flex: 1;
  min-height: 0; /* critical — without this flex won't constrain scroll */
  display: flex;
  flex-direction: column;
  padding: 0 0.5rem;
  overflow: hidden;
}
```

### `.table-container` (shared global)

All list pages use this class on the scrollable wrapper around the `<table>`.
It already has `flex: 1; min-height: 0; overflow-y: auto`.

`padding-bottom: 60px` provides clearance so the last row is never hidden
under the fixed footer when scrolled to the bottom.

---

## Required HTML Structure

```html
<body class="list-page">
  <header id="header"></header>

  <div class="recordsaddrecordheading">
    <h1>Page Title</h1>
    <button class="addrecordheadingbutton button" id="addBtn">+</button>
  </div>

  <!-- Optional: only include when the page has filter controls -->
  <div class="filter-bar">
    <label for="myFilter">Filter:</label>
    <input type="text" id="myFilter" />
    <!-- toggle switches, selects, etc. live here too -->
  </div>

  <main id="main">
    <!-- dialogs go here -->

    <!-- table wrapper — either static in HTML or appended by JS -->
    <div id="myTableContainer" class="table-container">
      <!-- table rendered by JS -->
    </div>
  </main>

  <footer id="footer"></footer>
</body>
```

> If you have a JS-only intermediate wrapper (like `#inputTableContainer`)
> that wraps the `.table-container`, it must also have
> `display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden`.
> See the CSS rule for `#inputTableContainer` in `styles.css`.

---

## The Flex Chain

Every level must pass `flex:1 + min-height:0` down to the scrollable container:

```
body.list-page        height:100dvh, flex column, overflow:hidden
  header              flex-shrink:0
  .recordsaddrecordheading  flex-shrink:0
  .filter-bar         flex-shrink:0
  #main               flex:1, min-height:0, flex column, overflow:hidden
    [optional wrapper]  flex:1, min-height:0, flex column, overflow:hidden
      .table-container  flex:1, min-height:0, overflow-y:auto
        table
```

**Why `min-height: 0`?** By default a flex item's minimum size is its content
size. Without `min-height:0` the container refuses to shrink below its table's
natural height, expanding the parent instead of scrolling.

---

## What NOT to Do

| Antipattern                                                        | Problem                                                        |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `maxHeight: "calc(80vh - 60px)"` in JS                             | Breaks whenever header/filter heights change                   |
| `marginBottom: "80px"` in JS on `.table-container`                 | Causes page overflow when body is not a flex container         |
| `padding-bottom: 60px` on `<body>`                                 | Steals 60px of viewport height from the table                  |
| `height: 100%` on `<body>` instead of `100dvh`                     | Requires `height:100%` on `<html>` too; `dvh` avoids the chain |
| Inline `style="display:flex; flex:1; overflow:hidden"` on `<main>` | Mixes layout concerns into HTML; harder to maintain            |

---

## Pages Using This Pattern

| Page               | Filter bar element                      |
| ------------------ | --------------------------------------- |
| `inputs.html`      | `#subjectFilter.filter-bar`             |
| `ncms.html`        | `#subjectFilter.filter-bar`             |
| `correctives.html` | _(no filter bar)_                       |
| `suppliers.html`   | `div.filter-bar`                        |
| `documents.html`   | _(no filter bar; table appended by JS)_ |
| `devices.html`     | `#deviceFilter.filter-bar`              |

---

## Adding a New List Page

1. Add `class="list-page"` to `<body>`.
2. Use the HTML structure above.
3. If your JS creates the `.table-container` dynamically and appends it to
   `#main`, just give it `class="table-container"` — no inline `maxHeight`,
   `marginBottom`, `overflowY`, or `border` needed.
4. If you have an intermediate wrapper div, add these CSS rules in `styles.css`:
   ```css
   #myTableContainer {
     display: flex;
     flex-direction: column;
     flex: 1;
     min-height: 0;
     overflow: hidden;
   }
   ```
