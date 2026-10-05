import { describe, it, expect } from "vitest";
import { countVisibleToolbarItems } from "./toolbar-overflow";

describe("countVisibleToolbarItems", () => {
  it("returns all items when they fit without a More button", () => {
    expect(countVisibleToolbarItems([40, 40, 40], 200, 48)).toBe(3);
  });

  it("reserves space for the More button when items overflow", () => {
    expect(countVisibleToolbarItems([80, 80, 80, 80], 200, 48)).toBe(1);
  });

  it("keeps at least one item visible when even the first item is tight", () => {
    expect(countVisibleToolbarItems([400, 80], 100, 48)).toBe(1);
  });

  it("returns zero for an empty list", () => {
    expect(countVisibleToolbarItems([], 200, 48)).toBe(0);
  });

  it("fits as many leading items as the remaining budget allows", () => {
    expect(countVisibleToolbarItems([50, 50, 50, 50], 180, 40)).toBe(2);
  });
});
