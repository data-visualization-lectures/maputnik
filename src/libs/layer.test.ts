import { describe, it, expect } from "vitest";
import {
  uniqueLayerListId,
  uniqueLayerListIds,
  layerIndexFromSortableId,
  layerIdFromSortableId,
} from "./layer";

describe("uniqueLayerListIds", () => {
  it("keeps ids unique when layer.id values collide", () => {
    const layers = [
      {id: "background"},
      {id: "water"},
      {id: "background"},
    ];

    expect(uniqueLayerListIds(layers)).toEqual([
      "layers-list-background-0",
      "layers-list-water-0",
      "layers-list-background-1",
    ]);
    expect(new Set(uniqueLayerListIds(layers)).size).toBe(layers.length);
  });

  it("maps sortable ids back to index and display id", () => {
    const layers = [
      {id: "dup"},
      {id: "other"},
      {id: "dup"},
    ];
    const secondDup = uniqueLayerListId("dup", 1);

    expect(layerIndexFromSortableId(layers, secondDup)).toBe(2);
    expect(layerIdFromSortableId(layers, secondDup)).toBe("dup");
    expect(layerIndexFromSortableId(layers, "missing")).toBe(-1);
    expect(layerIdFromSortableId(layers, "missing")).toBe("missing");
  });
});
