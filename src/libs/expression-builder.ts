import {findDefaultFromSpec} from "./spec-helper";

export type GuidedExpressionPattern =
  | "get"
  | "match"
  | "interpolate-zoom"
  | "step-zoom"
  | "case";

export type ExpressionPattern = GuidedExpressionPattern | "literal" | "unsupported";

export type MatchBranch = {
  label: string | number | boolean
  output: unknown
};

export type ZoomStop = {
  zoom: number
  output: unknown
};

export type CaseBranch = {
  condition: unknown
  output: unknown
};

export type ParsedGetExpression = {
  pattern: "get"
  property: string
  defaultValue?: unknown
};

export type ParsedMatchExpression = {
  pattern: "match"
  property: string
  branches: MatchBranch[]
  fallback: unknown
};

export type ParsedInterpolateZoomExpression = {
  pattern: "interpolate-zoom"
  interpolation: "linear" | "exponential"
  base: number
  stops: ZoomStop[]
};

export type ParsedStepZoomExpression = {
  pattern: "step-zoom"
  output0: unknown
  stops: ZoomStop[]
};

export type ParsedCaseExpression = {
  pattern: "case"
  branches: CaseBranch[]
  fallback: unknown
};

export type ParsedLiteralExpression = {
  pattern: "literal"
  value: unknown
};

export type ParsedGuidedExpression =
  | ParsedGetExpression
  | ParsedMatchExpression
  | ParsedInterpolateZoomExpression
  | ParsedStepZoomExpression
  | ParsedCaseExpression
  | ParsedLiteralExpression;

type FieldSpecLike = {
  type?: string
  default?: unknown
  expression?: {
    interpolated?: boolean
    parameters?: string[]
  }
};

function isPrimitiveLabel(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isGetProperty(value: unknown): value is ["get", string] {
  return Array.isArray(value) && value.length === 2 && value[0] === "get" && typeof value[1] === "string";
}

function isZoomInput(value: unknown): boolean {
  return Array.isArray(value) && value.length === 1 && value[0] === "zoom";
}

function isEven(n: number): boolean {
  return n % 2 === 0;
}

export function detectExpressionPattern(value: unknown): ExpressionPattern {
  if (!Array.isArray(value) || value.length === 0) {
    return "unsupported";
  }

  const op = value[0];

  if (op === "literal" && value.length === 2) {
    return "literal";
  }

  if (op === "get" && value.length >= 2 && value.length <= 3 && typeof value[1] === "string") {
    return "get";
  }

  if (op === "match" && value.length >= 5 && isEven(value.length - 3) && isGetProperty(value[1])) {
    const pairs = value.slice(2, -1);
    for (let i = 0; i < pairs.length; i += 2) {
      if (!isPrimitiveLabel(pairs[i])) {
        return "unsupported";
      }
    }
    return "match";
  }

  if (op === "interpolate" && value.length >= 7 && isEven(value.length - 3) && isZoomInput(value[2])) {
    const interpolation = value[1];
    if (Array.isArray(interpolation) && interpolation[0] === "linear" && interpolation.length === 1) {
      return "interpolate-zoom";
    }
    if (
      Array.isArray(interpolation) &&
      interpolation[0] === "exponential" &&
      interpolation.length === 2 &&
      typeof interpolation[1] === "number"
    ) {
      return "interpolate-zoom";
    }
  }

  if (op === "step" && value.length >= 5 && isEven(value.length - 3) && isZoomInput(value[1])) {
    const stops = value.slice(3);
    for (let i = 0; i < stops.length; i += 2) {
      if (typeof stops[i] !== "number") {
        return "unsupported";
      }
    }
    return "step-zoom";
  }

  if (op === "case" && value.length >= 4 && isEven(value.length - 2)) {
    return "case";
  }

  return "unsupported";
}

export function isGuidedExpressionPattern(pattern: ExpressionPattern): pattern is GuidedExpressionPattern | "literal" {
  return pattern !== "unsupported";
}

export function availableGuidedPatterns(fieldSpec?: FieldSpecLike): GuidedExpressionPattern[] {
  const patterns: GuidedExpressionPattern[] = ["get", "match", "case"];
  const interpolated = Boolean(fieldSpec?.expression?.interpolated);
  const zoomable = fieldSpec?.expression?.parameters?.includes("zoom");

  if (interpolated) {
    patterns.splice(2, 0, "interpolate-zoom");
  }
  if (zoomable || interpolated) {
    const insertAt = patterns.indexOf("case");
    patterns.splice(insertAt, 0, "step-zoom");
  }
  return patterns;
}

export function parseGuidedExpression(value: unknown): ParsedGuidedExpression | null {
  const pattern = detectExpressionPattern(value);
  if (!Array.isArray(value) || !isGuidedExpressionPattern(pattern) || pattern === "unsupported") {
    return null;
  }

  switch (pattern) {
    case "literal":
      return {pattern, value: value[1]};
    case "get": {
      const parsed: ParsedGetExpression = {pattern, property: value[1]};
      if (value.length === 3) {
        parsed.defaultValue = value[2];
      }
      return parsed;
    }
    case "match": {
      const pairs = value.slice(2, -1);
      const branches: MatchBranch[] = [];
      for (let i = 0; i < pairs.length; i += 2) {
        branches.push({
          label: pairs[i] as MatchBranch["label"],
          output: pairs[i + 1],
        });
      }
      return {
        pattern,
        property: value[1][1],
        branches,
        fallback: value[value.length - 1],
      };
    }
    case "interpolate-zoom": {
      const interpolation = value[1] as unknown[];
      const stopsRaw = value.slice(3);
      const stops: ZoomStop[] = [];
      for (let i = 0; i < stopsRaw.length; i += 2) {
        stops.push({
          zoom: Number(stopsRaw[i]),
          output: stopsRaw[i + 1],
        });
      }
      return {
        pattern,
        interpolation: interpolation[0] === "exponential" ? "exponential" : "linear",
        base: interpolation[0] === "exponential" ? Number(interpolation[1]) : 1,
        stops,
      };
    }
    case "step-zoom": {
      const stopsRaw = value.slice(3);
      const stops: ZoomStop[] = [];
      for (let i = 0; i < stopsRaw.length; i += 2) {
        stops.push({
          zoom: Number(stopsRaw[i]),
          output: stopsRaw[i + 1],
        });
      }
      return {
        pattern,
        output0: value[2],
        stops,
      };
    }
    case "case": {
      const pairs = value.slice(1, -1);
      const branches: CaseBranch[] = [];
      for (let i = 0; i < pairs.length; i += 2) {
        branches.push({
          condition: pairs[i],
          output: pairs[i + 1],
        });
      }
      return {
        pattern,
        branches,
        fallback: value[value.length - 1],
      };
    }
  }
}

export function defaultOutputForSpec(fieldSpec?: FieldSpecLike): unknown {
  if (!fieldSpec) {
    return "";
  }
  return findDefaultFromSpec(fieldSpec as {type: "string" | "color" | "boolean" | "array", default?: unknown});
}

function pickOutput(value: unknown, fieldSpec?: FieldSpecLike): unknown {
  const parsed = parseGuidedExpression(value);
  if (!parsed) {
    if (!Array.isArray(value)) {
      return value ?? defaultOutputForSpec(fieldSpec);
    }
    return defaultOutputForSpec(fieldSpec);
  }
  switch (parsed.pattern) {
    case "literal":
      return parsed.value;
    case "get":
      return parsed.defaultValue ?? defaultOutputForSpec(fieldSpec);
    case "match":
      return parsed.fallback;
    case "interpolate-zoom":
      return parsed.stops[0]?.output ?? defaultOutputForSpec(fieldSpec);
    case "step-zoom":
      return parsed.output0;
    case "case":
      return parsed.fallback;
  }
}

function pickProperty(value: unknown): string {
  const parsed = parseGuidedExpression(value);
  if (!parsed) {
    return "";
  }
  if (parsed.pattern === "get" || parsed.pattern === "match") {
    return parsed.property;
  }
  return "";
}

export function buildGetExpression(property: string, defaultValue?: unknown): unknown[] {
  if (defaultValue === undefined) {
    return ["get", property];
  }
  return ["get", property, defaultValue];
}

export function buildMatchExpression(property: string, branches: MatchBranch[], fallback: unknown): unknown[] {
  const expression: unknown[] = ["match", ["get", property]];
  for (const branch of branches) {
    expression.push(branch.label, branch.output);
  }
  expression.push(fallback);
  return expression;
}

export function buildInterpolateZoomExpression(
  interpolation: "linear" | "exponential",
  base: number,
  stops: ZoomStop[]
): unknown[] {
  const interpolationExpr = interpolation === "exponential" ? ["exponential", base] : ["linear"];
  const expression: unknown[] = ["interpolate", interpolationExpr, ["zoom"]];
  for (const stop of stops) {
    expression.push(stop.zoom, stop.output);
  }
  return expression;
}

export function buildStepZoomExpression(output0: unknown, stops: ZoomStop[]): unknown[] {
  const expression: unknown[] = ["step", ["zoom"], output0];
  for (const stop of stops) {
    expression.push(stop.zoom, stop.output);
  }
  return expression;
}

export function buildCaseExpression(branches: CaseBranch[], fallback: unknown): unknown[] {
  const expression: unknown[] = ["case"];
  for (const branch of branches) {
    expression.push(branch.condition, branch.output);
  }
  expression.push(fallback);
  return expression;
}

export function createGuidedExpression(
  pattern: GuidedExpressionPattern,
  fieldSpec?: FieldSpecLike,
  currentValue?: unknown
): unknown[] {
  const output = pickOutput(currentValue, fieldSpec);
  const property = pickProperty(currentValue);
  const parsed = parseGuidedExpression(currentValue);

  switch (pattern) {
    case "get":
      return buildGetExpression(property);
    case "match": {
      const branches = parsed?.pattern === "match"
        ? parsed.branches
        : [{label: "", output}];
      const fallback = parsed?.pattern === "match" ? parsed.fallback : output;
      return buildMatchExpression(property, branches, fallback);
    }
    case "interpolate-zoom": {
      const stops = parsed?.pattern === "interpolate-zoom"
        ? parsed.stops
        : parsed?.pattern === "step-zoom"
          ? [{zoom: 0, output: parsed.output0}, ...parsed.stops]
          : [{zoom: 6, output}, {zoom: 10, output}];
      const interpolation = parsed?.pattern === "interpolate-zoom" ? parsed.interpolation : "linear";
      const base = parsed?.pattern === "interpolate-zoom" ? parsed.base : 1;
      return buildInterpolateZoomExpression(interpolation, base, stops.length >= 2 ? stops : [...stops, {zoom: 10, output}]);
    }
    case "step-zoom": {
      if (parsed?.pattern === "step-zoom") {
        return buildStepZoomExpression(parsed.output0, parsed.stops);
      }
      if (parsed?.pattern === "interpolate-zoom" && parsed.stops.length > 0) {
        const [first, ...rest] = parsed.stops;
        return buildStepZoomExpression(first.output, rest.length > 0 ? rest : [{zoom: first.zoom + 4, output: first.output}]);
      }
      return buildStepZoomExpression(output, [{zoom: 10, output}]);
    }
    case "case": {
      const branches = parsed?.pattern === "case"
        ? parsed.branches
        : [{condition: ["==", ["get", property || ""], ""], output}];
      const fallback = parsed?.pattern === "case" ? parsed.fallback : output;
      return buildCaseExpression(branches, fallback);
    }
  }
}

export function coerceMatchLabel(raw: string, previous: MatchBranch["label"]): MatchBranch["label"] {
  if (typeof previous === "boolean") {
    if (raw === "true") return true;
    if (raw === "false") return false;
    return raw;
  }
  if (raw !== "" && Number.isFinite(Number(raw)) && String(Number(raw)) === raw) {
    return Number(raw);
  }
  if (typeof previous === "number" && raw !== "" && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return raw;
}
