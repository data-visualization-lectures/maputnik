import {describe, expect, it} from "vitest";
import {
  availableGuidedPatterns,
  buildCaseExpression,
  buildGetExpression,
  buildInterpolateZoomExpression,
  buildMatchExpression,
  buildStepZoomExpression,
  coerceMatchLabel,
  createGuidedExpression,
  detectExpressionPattern,
  parseGuidedExpression,
} from "./expression-builder";

describe("detectExpressionPattern", () => {
  it("detects get expressions", () => {
    expect(detectExpressionPattern(["get", "name"])).toBe("get");
    expect(detectExpressionPattern(["get", "name", "fallback"])).toBe("get");
  });

  it("detects literal expressions", () => {
    expect(detectExpressionPattern(["literal", "#fff"])).toBe("literal");
  });

  it("detects match expressions with get input", () => {
    expect(detectExpressionPattern(["match", ["get", "type"], "a", "#f00", "b", "#0f0", "#000"])).toBe("match");
  });

  it("detects interpolate and step by zoom", () => {
    expect(detectExpressionPattern(["interpolate", ["linear"], ["zoom"], 0, 1, 10, 2])).toBe("interpolate-zoom");
    expect(detectExpressionPattern(["interpolate", ["exponential", 1.5], ["zoom"], 0, "#000", 10, "#fff"])).toBe("interpolate-zoom");
    expect(detectExpressionPattern(["step", ["zoom"], 0, 10, 1, 16, 2])).toBe("step-zoom");
  });

  it("detects case expressions", () => {
    expect(detectExpressionPattern(["case", ["==", ["get", "x"], "y"], 1, 0])).toBe("case");
  });

  it("falls back to unsupported for other shapes", () => {
    expect(detectExpressionPattern(["interpolate", ["linear"], ["elevation"], 0, "black", 2000, "white"])).toBe("unsupported");
    expect(detectExpressionPattern(["match", ["zoom"], 1, "a", "b"])).toBe("unsupported");
    expect(detectExpressionPattern(["coalesce", ["get", "a"], "b"])).toBe("unsupported");
    expect(detectExpressionPattern(["get", ["get", "nested"]])).toBe("unsupported");
    expect(detectExpressionPattern({stops: [[0, 1]]})).toBe("unsupported");
  });
});

describe("parseGuidedExpression", () => {
  it("parses interpolate zoom stops and exponential base", () => {
    expect(parseGuidedExpression(["interpolate", ["exponential", 1.75], ["zoom"], 6, 0.2, 10, 1])).toEqual({
      pattern: "interpolate-zoom",
      interpolation: "exponential",
      base: 1.75,
      stops: [
        {zoom: 6, output: 0.2},
        {zoom: 10, output: 1},
      ],
    });
  });

  it("parses match branches", () => {
    expect(parseGuidedExpression(["match", ["get", "class"], "motorway", 2, "street", 1, 0])).toEqual({
      pattern: "match",
      property: "class",
      branches: [
        {label: "motorway", output: 2},
        {label: "street", output: 1},
      ],
      fallback: 0,
    });
  });

  it("returns null for unsupported expressions", () => {
    expect(parseGuidedExpression(["to-number", ["get", "a"]])).toBeNull();
  });
});

describe("createGuidedExpression", () => {
  const colorSpec = {
    type: "color",
    default: "#000000",
    expression: {interpolated: true, parameters: ["zoom", "feature"]},
  };

  it("creates defaults for each guided pattern", () => {
    expect(createGuidedExpression("get", colorSpec, "#f00")).toEqual(["get", ""]);
    expect(createGuidedExpression("match", colorSpec, ["literal", "#f00"])).toEqual(["match", ["get", ""], "", "#f00", "#f00"]);
    expect(createGuidedExpression("interpolate-zoom", colorSpec, ["literal", "#f00"])).toEqual([
      "interpolate", ["linear"], ["zoom"], 6, "#f00", 10, "#f00",
    ]);
    expect(createGuidedExpression("step-zoom", colorSpec, ["literal", "#f00"])).toEqual([
      "step", ["zoom"], "#f00", 10, "#f00",
    ]);
    expect(createGuidedExpression("case", colorSpec, ["literal", "#f00"])).toEqual([
      "case", ["==", ["get", ""], ""], "#f00", "#f00",
    ]);
  });

  it("preserves property names when converting get to match", () => {
    expect(createGuidedExpression("match", colorSpec, ["get", "kind"])).toEqual([
      "match", ["get", "kind"], "", "#000000", "#000000",
    ]);
  });

  it("converts interpolate stops into step", () => {
    expect(createGuidedExpression(
      "step-zoom",
      colorSpec,
      ["interpolate", ["linear"], ["zoom"], 4, 0.2, 12, 1]
    )).toEqual(["step", ["zoom"], 0.2, 12, 1]);
  });
});

describe("builders and helpers", () => {
  it("round-trips get/match/case/zoom builders", () => {
    expect(buildGetExpression("name")).toEqual(["get", "name"]);
    expect(buildGetExpression("name", "n/a")).toEqual(["get", "name", "n/a"]);
    expect(buildMatchExpression("type", [{label: "a", output: 1}], 0)).toEqual(["match", ["get", "type"], "a", 1, 0]);
    expect(buildInterpolateZoomExpression("linear", 1, [{zoom: 0, output: 1}, {zoom: 10, output: 2}])).toEqual([
      "interpolate", ["linear"], ["zoom"], 0, 1, 10, 2,
    ]);
    expect(buildStepZoomExpression(0, [{zoom: 8, output: 1}])).toEqual(["step", ["zoom"], 0, 8, 1]);
    expect(buildCaseExpression([{condition: true, output: 1}], 0)).toEqual(["case", true, 1, 0]);
  });

  it("coerces match labels to numbers when numeric", () => {
    expect(coerceMatchLabel("12", "")).toBe(12);
    expect(coerceMatchLabel("abc", 4)).toBe("abc");
    expect(coerceMatchLabel("true", true)).toBe(true);
    expect(coerceMatchLabel("false", true)).toBe(false);
  });

  it("lists interpolate only for interpolated specs", () => {
    expect(availableGuidedPatterns({expression: {interpolated: true, parameters: ["zoom"]}})).toEqual([
      "get", "match", "interpolate-zoom", "step-zoom", "case",
    ]);
    expect(availableGuidedPatterns({expression: {interpolated: false, parameters: ["feature"]}})).toEqual([
      "get", "match", "case",
    ]);
  });
});
