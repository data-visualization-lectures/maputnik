/**
 * How many leading toolbar items fit in `availableWidth`.
 * When they do not all fit, `moreButtonWidth` is reserved for the overflow control.
 */
export function countVisibleToolbarItems(
  itemWidths: number[],
  availableWidth: number,
  moreButtonWidth: number,
): number {
  if (itemWidths.length === 0) {
    return 0;
  }

  const total = itemWidths.reduce((sum, width) => sum + width, 0);
  if (total <= availableWidth) {
    return itemWidths.length;
  }

  const budget = Math.max(0, availableWidth - moreButtonWidth);
  let used = 0;
  let count = 0;
  for (const width of itemWidths) {
    if (used + width > budget) {
      break;
    }
    used += width;
    count += 1;
  }

  // Keep at least one action in the bar so the overflow control is not the only control.
  return Math.max(count, 1);
}

export const TOOLBAR_COMPACT_WIDTH = 900;
