# Split Pane Feature Design

## Overview

Split pane support is the #1 missing feature for commercial viability. All major terminal competitors (iTerm2, Windows Terminal, Warp) support split panes.

## Architecture Design

### 1. Layout Model

```typescript
// New types for split pane support
export type PaneDirection = "horizontal" | "vertical";

export interface PaneNode {
  id: string;
  type: "pane" | "split";
  // For "pane" type - actual terminal content
  tabId?: string;
  size?: number; // 0-1, relative size
  // For "split" type - container with children
  direction?: PaneDirection;
  children?: PaneNode[];
}

export interface SplitPaneState {
  root: PaneNode;
  activePaneId: string;
  paneIds: string[]; // All pane IDs in layout
}
```

### 2. State Management

**Current State**: Single tab model
**New State**: Pane tree model with multiple tabs per pane

Key changes to `TerminalShellModel`:
- Replace single tab list with pane tree structure
- Each pane can contain a terminal tab
- Support recursive splits (split within splits)

### 3. Component Structure

```
TerminalShellView
├── PaneLayoutView (NEW)
│   ├── PaneContainer
│   │   ├── PaneView
│   │   │   ├── TerminalViewportView (existing)
│   │   │   └── PaneToolbar (NEW)
│   │   └── ResizeHandle (NEW)
│   └── PaneContainer (split)
│       ├── PaneView...
│       └── PaneView...
```

### 4. Commands

| Command | Action |
|---------|--------|
| split-pane-horizontal | Split active pane left/right |
| split-pane-vertical | Split active pane top/bottom |
| close-pane | Close current pane |
| focus-pane-up/down/left/right | Navigate between panes |
| resize-pane | Adjust pane size |
| move-pane-to-tab | Convert pane to standalone tab |

### 5. Keybinding Integration

```typescript
const SPLIT_PANE_KEYBINDINGS = {
  "split-horizontal": "Ctrl+Shift+H",
  "split-vertical": "Ctrl+Shift+V",
  "close-pane": "Ctrl+Shift+W",
  "focus-up": "Ctrl+Shift+Up",
  "focus-down": "Ctrl+Shift+Down",
  "focus-left": "Ctrl+Shift+Left",
  "focus-right": "Ctrl+Shift+Right",
};
```

### 6. Persistence

Pane layout stored in session state:
- Pane tree structure
- Tab assignments per pane
- Active pane tracking
- Size ratios

### 7. UI Design

**Visual Layout**:
- Panes separated by draggable resize handles
- Active pane highlighted with subtle border
- Each pane has mini-toolbar (close, split buttons)
- Resize handles show direction indicator

**Color Scheme**:
- Resize handle: Subtle gray line (2px)
- Active pane border: Accent color (1px)
- Pane toolbar: Minimal, transparent background

## Implementation Plan

### Phase 1: Core Types (4 hours)
- Define PaneNode, SplitPaneState types
- Add to model.ts type definitions
- Create pane tree utility functions

### Phase 2: State Management (8 hours)
- Extend TerminalShellModel with pane tree
- Implement split/close/focus operations
- Update tab lifecycle to work with panes

### Phase 3: UI Components (12 hours)
- Create PaneLayoutView component
- Create PaneView wrapper component
- Create ResizeHandle component with drag support
- Update TerminalShellView to use pane layout

### Phase 4: Commands & Keybindings (6 hours)
- Implement split pane commands
- Add keybinding configuration
- Create command palette entries

### Phase 5: Persistence (4 hours)
- Store pane layout in session
- Restore pane layout on startup
- Handle session recovery with panes

### Phase 6: Polish & Testing (6 hours)
- Smooth resize animations
- Focus management
- Edge cases (closing last pane)
- Integration tests

**Total Estimated Effort**: 40 hours

## Dependencies

- No external dependencies required
- Uses existing terminal components
- Minimal impact on current architecture

## Migration Path

1. Keep single-tab mode as default
2. Add split pane as optional feature
3. Users can enable via settings
4. Gradual rollout with feedback collection

## Success Criteria

- Users can split panes horizontally and vertically
- Resize handles work smoothly
- Focus navigation works between panes
- Layout persists across sessions
- Performance remains good with multiple panes
- Works on both desktop and web modes

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Performance with many panes | Limit max panes (8), use efficient rendering |
| Layout complexity | Keep tree structure simple, limit nesting |
| User confusion | Clear visual indicators, good documentation |
| Session recovery edge cases | Normalize layout on recovery |

## Competitive Comparison

| Feature | iTerm2 | WinTerminal | Warp | sdkwork (after) |
|---------|--------|-------------|------|-----------------|
| Horizontal split | ✅ | ✅ | ✅ | ✅ |
| Vertical split | ✅ | ✅ | ✅ | ✅ |
| Resize handles | ✅ | ✅ | ✅ | ✅ |
| Unlimited splits | ✅ | ✅ | ⚠️ | ⚠️ (8 max) |
| Pane navigation | ✅ | ✅ | ✅ | ✅ |
| Layout persistence | ⚠️ | ⚠️ | ⚠️ | ✅ |

## Post-Implementation

After split pane is complete:
1. Update user documentation
2. Create tutorial/walkthrough
3. Gather user feedback
4. Iterate on UX based on feedback
5. Consider advanced features (pane tabs, pane zoom)

