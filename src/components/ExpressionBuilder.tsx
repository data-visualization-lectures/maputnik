import React from "react";
import {useTranslation} from "react-i18next";
import {MdDelete} from "react-icons/md";
import {PiListPlusBold} from "react-icons/pi";
import classnames from "classnames";

import InputButton from "./InputButton";
import InputNumber from "./InputNumber";
import InputSelect from "./InputSelect";
import InputSpec from "./InputSpec";
import InputString from "./InputString";
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
  type CaseBranch,
  type GuidedExpressionPattern,
  type MatchBranch,
  type ZoomStop,
} from "../libs/expression-builder";
import type {StylePropertySpecification} from "maplibre-gl";

type ExpressionBuilderProps = {
  value: unknown
  fieldName: string
  fieldSpec?: StylePropertySpecification
  onChange(value: unknown): void
};

const PATTERN_LABELS: Record<GuidedExpressionPattern, string> = {
  "get": "Get",
  "match": "Match",
  "interpolate-zoom": "Interpolate by zoom",
  "step-zoom": "Step by zoom",
  "case": "Case",
};

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  }
  catch {
    return "";
  }
}

function JsonSnippetInput(props: {
  value: unknown
  onChange(value: unknown): void
  "data-wd-key"?: string
  "aria-label"?: string
}) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(() => stringifyJson(props.value));
  const [invalid, setInvalid] = React.useState(false);

  React.useEffect(() => {
    if (!editing) {
      setText(stringifyJson(props.value));
      setInvalid(false);
    }
  }, [props.value, editing]);

  const commit = () => {
    try {
      props.onChange(JSON.parse(text));
      setInvalid(false);
    }
    catch {
      setInvalid(true);
    }
    setEditing(false);
  };

  return (
    <input
      className={classnames("maputnik-string", {"maputnik-expression-json--invalid": invalid})}
      data-wd-key={props["data-wd-key"]}
      aria-label={props["aria-label"]}
      value={text}
      onChange={(e) => {
        setEditing(true);
        setText(e.target.value);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
        }
      }}
    />
  );
}

function ExpressionValueInput(props: {
  value: unknown
  fieldName: string
  fieldSpec?: StylePropertySpecification
  onChange(value: unknown): void
  "data-wd-key"?: string
  "aria-label"?: string
}) {
  if (Array.isArray(props.value) || (props.value !== null && typeof props.value === "object")) {
    return (
      <JsonSnippetInput
        value={props.value}
        onChange={props.onChange}
        data-wd-key={props["data-wd-key"]}
        aria-label={props["aria-label"]}
      />
    );
  }

  return (
    <InputSpec
      fieldName={props.fieldName}
      fieldSpec={props.fieldSpec as React.ComponentProps<typeof InputSpec>["fieldSpec"]}
      value={props.value as string | number | boolean | unknown[] | undefined}
      aria-label={props["aria-label"]}
      onChange={(_name, value) => props.onChange(value)}
    />
  );
}

function UnsupportedBuilder(props: {
  t: (key: string) => string
}) {
  const {t} = props;
  return (
    <div className="maputnik-expression-builder__unsupported" data-wd-key="expression-builder-unsupported">
      <p>
        {t("This expression is not supported by the guided builder. Edit it as JSON, or choose a pattern to replace it.")}
      </p>
    </div>
  );
}

const ExpressionBuilder: React.FC<ExpressionBuilderProps> = (props) => {
  const {t} = useTranslation();
  const pattern = detectExpressionPattern(props.value);
  const parsed = parseGuidedExpression(props.value);
  const patterns = availableGuidedPatterns(props.fieldSpec);
  const patternOptions = patterns.map((item) => [item, t(PATTERN_LABELS[item])] as [string, string]);

  const emit = (next: unknown) => {
    props.onChange(next);
  };

  const onChoosePattern = (nextPattern: GuidedExpressionPattern) => {
    emit(createGuidedExpression(nextPattern, props.fieldSpec, props.value));
  };

  const selectedPattern = pattern === "literal" || pattern === "unsupported" ? "" : pattern;

  const patternSelect = (
    <div className="maputnik-expression-builder__field">
      <span>{t("Pattern")}</span>
      <InputSelect
        data-wd-key="expression-builder-pattern"
        aria-label={t("Pattern")}
        value={selectedPattern}
        options={
          selectedPattern
            ? patternOptions
            : [["", t("Choose a pattern")], ...patternOptions]
        }
        onChange={(value) => {
          if (value) {
            onChoosePattern(value as GuidedExpressionPattern);
          }
        }}
      />
    </div>
  );

  if (pattern === "unsupported" || !parsed) {
    return (
      <div className="maputnik-expression-builder">
        {patternSelect}
        <UnsupportedBuilder t={t} />
      </div>
    );
  }

  if (parsed.pattern === "literal") {
    return (
      <div className="maputnik-expression-builder" data-wd-key="expression-builder-literal">
        {patternSelect}
        <p className="maputnik-expression-builder__hint">
          {t("Choose a pattern to build this expression. The current value is kept as a starting output.")}
        </p>
        <div className="maputnik-expression-builder__field">
          <span>{t("Current value")}</span>
          <ExpressionValueInput
            value={parsed.value}
            fieldName={props.fieldName}
            fieldSpec={props.fieldSpec}
            aria-label={t("Current value")}
            data-wd-key="expression-builder-literal-value"
            onChange={(value) => emit(["literal", value])}
          />
        </div>
      </div>
    );
  }

  if (parsed.pattern === "get") {
    return (
      <div className="maputnik-expression-builder" data-wd-key="expression-builder-get">
        {patternSelect}
        <div className="maputnik-expression-builder__field">
          <span>{t("Property")}</span>
          <InputString
            data-wd-key="expression-builder-get-property"
            aria-label={t("Property")}
            value={parsed.property}
            onChange={(value) => emit(buildGetExpression(value || "", parsed.defaultValue))}
          />
        </div>
      </div>
    );
  }

  if (parsed.pattern === "match") {
    const updateBranch = (index: number, patch: Partial<MatchBranch>) => {
      const branches = parsed.branches.map((branch, i) => i === index ? {...branch, ...patch} : branch);
      emit(buildMatchExpression(parsed.property, branches, parsed.fallback));
    };
    return (
      <div className="maputnik-expression-builder" data-wd-key="expression-builder-match">
        {patternSelect}
        <div className="maputnik-expression-builder__field">
          <span>{t("Property")}</span>
          <InputString
            data-wd-key="expression-builder-match-property"
            aria-label={t("Property")}
            value={parsed.property}
            onChange={(value) => emit(buildMatchExpression(value || "", parsed.branches, parsed.fallback))}
          />
        </div>
        <div className="maputnik-expression-builder__rows">
          {parsed.branches.map((branch, index) => (
            <div className="maputnik-expression-builder__row" key={index}>
              <InputString
                data-wd-key={`expression-builder-match-label-${index}`}
                aria-label={t("Match label")}
                value={String(branch.label)}
                onChange={(value) => updateBranch(index, {label: coerceMatchLabel(value || "", branch.label)})}
              />
              <ExpressionValueInput
                value={branch.output}
                fieldName={props.fieldName}
                fieldSpec={props.fieldSpec}
                aria-label={t("Output value")}
                data-wd-key={`expression-builder-match-output-${index}`}
                onChange={(output) => updateBranch(index, {output})}
              />
              <InputButton
                className="maputnik-delete-stop"
                title={t("Remove zoom level from stop")}
                aria-label={t("Remove match branch")}
                onClick={() => {
                  const branches = parsed.branches.filter((_, i) => i !== index);
                  const next = branches.length > 0 ? branches : [{label: "", output: parsed.fallback}];
                  emit(buildMatchExpression(parsed.property, next, parsed.fallback));
                }}
              >
                <MdDelete />
              </InputButton>
            </div>
          ))}
        </div>
        <div className="maputnik-expression-builder__field">
          <span>{t("Fallback")}</span>
          <ExpressionValueInput
            value={parsed.fallback}
            fieldName={props.fieldName}
            fieldSpec={props.fieldSpec}
            aria-label={t("Fallback")}
            data-wd-key="expression-builder-match-fallback"
            onChange={(fallback) => emit(buildMatchExpression(parsed.property, parsed.branches, fallback))}
          />
        </div>
        <InputButton
          className="maputnik-add-stop"
          data-wd-key="expression-builder-match-add"
          onClick={() => emit(buildMatchExpression(
            parsed.property,
            [...parsed.branches, {label: "", output: parsed.fallback}],
            parsed.fallback
          ))}
        >
          <PiListPlusBold style={{verticalAlign: "text-bottom"}} />
          {t("Add stop")}
        </InputButton>
      </div>
    );
  }

  if (parsed.pattern === "interpolate-zoom") {
    const updateStop = (index: number, patch: Partial<ZoomStop>) => {
      const stops = parsed.stops.map((stop, i) => i === index ? {...stop, ...patch} : stop);
      emit(buildInterpolateZoomExpression(parsed.interpolation, parsed.base, stops));
    };
    return (
      <div className="maputnik-expression-builder" data-wd-key="expression-builder-interpolate">
        {patternSelect}
        <div className="maputnik-expression-builder__field">
          <span>{t("Interpolation")}</span>
          <InputSelect
            data-wd-key="expression-builder-interpolation"
            aria-label={t("Interpolation")}
            value={parsed.interpolation}
            options={[
              ["linear", t("Linear")],
              ["exponential", t("Exponential")],
            ]}
            onChange={(value) => emit(buildInterpolateZoomExpression(
              value as "linear" | "exponential",
              parsed.base,
              parsed.stops
            ))}
          />
        </div>
        {parsed.interpolation === "exponential" && (
          <div className="maputnik-expression-builder__field">
            <span>{t("Base")}</span>
            <InputNumber
              data-wd-key="expression-builder-interpolation-base"
              aria-label={t("Base")}
              value={parsed.base}
              onChange={(base) => emit(buildInterpolateZoomExpression(parsed.interpolation, base ?? 1, parsed.stops))}
            />
          </div>
        )}
        <div className="maputnik-expression-builder__rows">
          {parsed.stops.map((stop, index) => (
            <div className="maputnik-expression-builder__row" key={index}>
              <InputNumber
                data-wd-key={`expression-builder-zoom-${index}`}
                aria-label={t("Zoom")}
                value={stop.zoom}
                onChange={(zoom) => updateStop(index, {zoom: zoom ?? 0})}
              />
              <ExpressionValueInput
                value={stop.output}
                fieldName={props.fieldName}
                fieldSpec={props.fieldSpec}
                aria-label={t("Output value")}
                data-wd-key={`expression-builder-zoom-output-${index}`}
                onChange={(output) => updateStop(index, {output})}
              />
              <InputButton
                className="maputnik-delete-stop"
                title={t("Remove zoom level from stop")}
                aria-label={t("Remove zoom level from stop")}
                disabled={parsed.stops.length <= 2}
                onClick={() => {
                  if (parsed.stops.length <= 2) return;
                  emit(buildInterpolateZoomExpression(
                    parsed.interpolation,
                    parsed.base,
                    parsed.stops.filter((_, i) => i !== index)
                  ));
                }}
              >
                <MdDelete />
              </InputButton>
            </div>
          ))}
        </div>
        <InputButton
          className="maputnik-add-stop"
          data-wd-key="expression-builder-zoom-add"
          onClick={() => {
            const last = parsed.stops[parsed.stops.length - 1];
            emit(buildInterpolateZoomExpression(
              parsed.interpolation,
              parsed.base,
              [...parsed.stops, {zoom: last.zoom + 1, output: last.output}]
            ));
          }}
        >
          <PiListPlusBold style={{verticalAlign: "text-bottom"}} />
          {t("Add stop")}
        </InputButton>
      </div>
    );
  }

  if (parsed.pattern === "step-zoom") {
    const updateStop = (index: number, patch: Partial<ZoomStop>) => {
      const stops = parsed.stops.map((stop, i) => i === index ? {...stop, ...patch} : stop);
      emit(buildStepZoomExpression(parsed.output0, stops));
    };
    return (
      <div className="maputnik-expression-builder" data-wd-key="expression-builder-step">
        {patternSelect}
        <div className="maputnik-expression-builder__field">
          <span>{t("Default")}</span>
          <ExpressionValueInput
            value={parsed.output0}
            fieldName={props.fieldName}
            fieldSpec={props.fieldSpec}
            aria-label={t("Default")}
            data-wd-key="expression-builder-step-default"
            onChange={(output0) => emit(buildStepZoomExpression(output0, parsed.stops))}
          />
        </div>
        <div className="maputnik-expression-builder__rows">
          {parsed.stops.map((stop, index) => (
            <div className="maputnik-expression-builder__row" key={index}>
              <InputNumber
                data-wd-key={`expression-builder-step-zoom-${index}`}
                aria-label={t("Zoom")}
                value={stop.zoom}
                onChange={(zoom) => updateStop(index, {zoom: zoom ?? 0})}
              />
              <ExpressionValueInput
                value={stop.output}
                fieldName={props.fieldName}
                fieldSpec={props.fieldSpec}
                aria-label={t("Output value")}
                data-wd-key={`expression-builder-step-output-${index}`}
                onChange={(output) => updateStop(index, {output})}
              />
              <InputButton
                className="maputnik-delete-stop"
                title={t("Remove zoom level from stop")}
                aria-label={t("Remove zoom level from stop")}
                onClick={() => {
                  const stops = parsed.stops.filter((_, i) => i !== index);
                  emit(buildStepZoomExpression(parsed.output0, stops.length > 0 ? stops : [{zoom: 10, output: parsed.output0}]));
                }}
              >
                <MdDelete />
              </InputButton>
            </div>
          ))}
        </div>
        <InputButton
          className="maputnik-add-stop"
          data-wd-key="expression-builder-step-add"
          onClick={() => {
            const last = parsed.stops[parsed.stops.length - 1];
            emit(buildStepZoomExpression(parsed.output0, [...parsed.stops, {zoom: last.zoom + 1, output: last.output}]));
          }}
        >
          <PiListPlusBold style={{verticalAlign: "text-bottom"}} />
          {t("Add stop")}
        </InputButton>
      </div>
    );
  }

  const updateCaseBranch = (index: number, patch: Partial<CaseBranch>) => {
    const branches = parsed.branches.map((branch, i) => i === index ? {...branch, ...patch} : branch);
    emit(buildCaseExpression(branches, parsed.fallback));
  };

  return (
    <div className="maputnik-expression-builder" data-wd-key="expression-builder-case">
      {patternSelect}
      <div className="maputnik-expression-builder__rows">
        {parsed.branches.map((branch, index) => (
          <div className="maputnik-expression-builder__row maputnik-expression-builder__row--case" key={index}>
            <JsonSnippetInput
              value={branch.condition}
              data-wd-key={`expression-builder-case-condition-${index}`}
              aria-label={t("Condition")}
              onChange={(condition) => updateCaseBranch(index, {condition})}
            />
            <ExpressionValueInput
              value={branch.output}
              fieldName={props.fieldName}
              fieldSpec={props.fieldSpec}
              aria-label={t("Output value")}
              data-wd-key={`expression-builder-case-output-${index}`}
              onChange={(output) => updateCaseBranch(index, {output})}
            />
            <InputButton
              className="maputnik-delete-stop"
              title={t("Remove zoom level from stop")}
              aria-label={t("Remove case branch")}
              onClick={() => {
                const branches = parsed.branches.filter((_, i) => i !== index);
                const next = branches.length > 0 ? branches : [{condition: ["==", ["get", ""], ""], output: parsed.fallback}];
                emit(buildCaseExpression(next, parsed.fallback));
              }}
            >
              <MdDelete />
            </InputButton>
          </div>
        ))}
      </div>
      <div className="maputnik-expression-builder__field">
        <span>{t("Fallback")}</span>
        <ExpressionValueInput
          value={parsed.fallback}
          fieldName={props.fieldName}
          fieldSpec={props.fieldSpec}
          aria-label={t("Fallback")}
          data-wd-key="expression-builder-case-fallback"
          onChange={(fallback) => emit(buildCaseExpression(parsed.branches, fallback))}
        />
      </div>
      <InputButton
        className="maputnik-add-stop"
        data-wd-key="expression-builder-case-add"
        onClick={() => emit(buildCaseExpression(
          [...parsed.branches, {condition: ["==", ["get", ""], ""], output: parsed.fallback}],
          parsed.fallback
        ))}
      >
        <PiListPlusBold style={{verticalAlign: "text-bottom"}} />
        {t("Add stop")}
      </InputButton>
    </div>
  );
};

export default ExpressionBuilder;
