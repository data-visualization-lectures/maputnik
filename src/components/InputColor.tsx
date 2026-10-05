import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import Color from "color";
import ChromePicker from "react-color/lib/components/chrome/Chrome";
import {type ColorResult} from "react-color";
import lodash from "lodash";
import classnames from "classnames";
import {useTranslation} from "react-i18next";

function formatColor(color: ColorResult): string {
  const rgb = color.rgb;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
}

function isParsableColor(value?: string): value is string {
  if (!value) {
    return false;
  }
  try {
    Color(value);
    return true;
  }
  catch {
    return false;
  }
}

function initialValidColor(value?: string, fallback?: string): string {
  if (isParsableColor(value)) {
    return value;
  }
  if (isParsableColor(fallback)) {
    return fallback;
  }
  return "#ffffff";
}

function toChromeColor(value: string) {
  const currentColor = Color(value).rgb().object();
  return {
    r: currentColor.r,
    g: currentColor.g,
    b: currentColor.b,
    a: currentColor.alpha ?? 1
  };
}

const PICKER_WIDTH = 230;
const PICKER_HEIGHT = 250;
const PICKER_GAP = 8;

function calcPickerPlacement(anchor: HTMLElement | null) {
  if (!anchor) {
    return {
      top: 160,
      left: 555,
      origin: "top left"
    };
  }

  const pos = anchor.getBoundingClientRect();
  let left = pos.right + PICKER_GAP;
  let top = pos.top;
  let origin = "top left";

  if (left + PICKER_WIDTH > window.innerWidth - PICKER_GAP) {
    left = Math.max(PICKER_GAP, pos.left - PICKER_WIDTH - PICKER_GAP);
    origin = "top right";
  }
  if (top + PICKER_HEIGHT > window.innerHeight - PICKER_GAP) {
    top = Math.max(PICKER_GAP, window.innerHeight - PICKER_HEIGHT - PICKER_GAP);
    origin = origin === "top right" ? "bottom right" : "bottom left";
  }

  return {top, left, origin};
}

export type InputColorProps = {
  onChange(...args: unknown[]): unknown
  name?: string
  value?: string
  doc?: string
  style?: object
  default?: string
  "aria-label"?: string
  "data-wd-key"?: string
};

const InputColor: React.FC<InputColorProps> = (props) => {
  const {t} = useTranslation();
  const pickerId = useId();
  const errorId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;

  const [pickerOpened, setPickerOpened] = useState(false);
  const [pickerEntered, setPickerEntered] = useState(false);
  const [instantMotion, setInstantMotion] = useState(false);
  const [placement, setPlacement] = useState(() => calcPickerPlacement(null));
  const [lastValidColor, setLastValidColor] = useState(() => (
    initialValidColor(props.value, props.default)
  ));

  const onChangeNoCheck = useMemo(
    () => lodash.throttle((v: string) => {
      onChangeRef.current(v);
    }, 1000 / 30),
    []
  );

  useEffect(() => {
    return () => {
      onChangeNoCheck.cancel();
    };
  }, [onChangeNoCheck]);

  useEffect(() => {
    if (isParsableColor(props.value)) {
      setLastValidColor(props.value);
    }
  }, [props.value]);

  const isInvalid = Boolean(props.value) && !isParsableColor(props.value);
  const chromeColor = toChromeColor(lastValidColor);

  const closePicker = useCallback((options?: {restoreFocus?: boolean, instant?: boolean}) => {
    if (options?.instant) {
      setInstantMotion(true);
    }
    setPickerEntered(false);
    setPickerOpened(false);
    if (options?.restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const openPicker = useCallback((trigger: HTMLElement, instant = false) => {
    triggerRef.current = trigger;
    setInstantMotion(instant);
    setPlacement(calcPickerPlacement(wrapperRef.current));
    setPickerOpened(true);
  }, []);

  const togglePicker = useCallback((trigger: HTMLElement, instant = false) => {
    if (pickerOpened) {
      closePicker({restoreFocus: true, instant});
    }
    else {
      openPicker(trigger, instant);
    }
  }, [closePicker, openPicker, pickerOpened]);

  useEffect(() => {
    if (!pickerOpened) {
      setPickerEntered(false);
      return;
    }

    const updatePlacement = () => {
      setPlacement(calcPickerPlacement(wrapperRef.current));
    };
    updatePlacement();

    const frame = window.requestAnimationFrame(() => {
      setPickerEntered(true);
      pickerRef.current?.focus();
    });

    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [pickerOpened]);

  useEffect(() => {
    if (!pickerOpened) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (wrapperRef.current?.contains(target) || pickerRef.current?.contains(target)) {
        return;
      }
      closePicker({restoreFocus: false});
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.type === "keydown") {
        closePicker({restoreFocus: true, instant: true});
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onEscape, true);
    document.addEventListener("keyup", onEscape, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onEscape, true);
      document.removeEventListener("keyup", onEscape, true);
    };
  }, [closePicker, pickerOpened]);

  const onInputChange = (value: string) => {
    props.onChange(value === "" ? undefined : value);
  };

  const isKeyboardClick = (event: React.MouseEvent) => event.detail === 0;
  const swatchLabel = pickerOpened ? t("Close color picker") : t("Open color picker");

  const picker = pickerOpened ? createPortal(
    <div
      ref={pickerRef}
      id={pickerId}
      role="dialog"
      aria-label={t("Color picker")}
      tabIndex={-1}
      data-wd-key="color-picker"
      className={classnames({
        "maputnik-color-picker": true,
        "maputnik-color-picker--open": pickerEntered,
        "maputnik-color-picker--instant": instantMotion,
      })}
      style={{
        top: placement.top,
        left: placement.left,
        ["--maputnik-color-picker-origin" as string]: placement.origin,
      }}
    >
      <ChromePicker
        color={chromeColor}
        onChange={c => onChangeNoCheck(formatColor(c))}
      />
    </div>,
    document.body
  ) : null;

  return <div className="maputnik-color-wrapper" ref={wrapperRef}>
    <button
      type="button"
      className="maputnik-color-swatch"
      style={{backgroundColor: lastValidColor}}
      aria-label={swatchLabel}
      aria-expanded={pickerOpened}
      aria-haspopup="dialog"
      aria-controls={pickerId}
      data-wd-key={props["data-wd-key"] ? `${props["data-wd-key"]}.swatch` : "color-swatch"}
      onClick={(event) => {
        event.preventDefault();
        togglePicker(event.currentTarget, isKeyboardClick(event));
      }}
    />
    <input
      aria-label={props["aria-label"]}
      aria-invalid={isInvalid}
      aria-describedby={isInvalid ? errorId : undefined}
      spellCheck="false"
      autoComplete="off"
      className={classnames({
        "maputnik-color": true,
        "maputnik-color--invalid": isInvalid,
      })}
      data-wd-key={props["data-wd-key"]}
      onClick={(event) => {
        togglePicker(event.currentTarget, isKeyboardClick(event));
      }}
      style={props.style}
      name={props.name}
      placeholder={props.default}
      value={props.value ? props.value : ""}
      onChange={(e) => onInputChange(e.target.value)}
    />
    {isInvalid &&
      <div
        id={errorId}
        className="maputnik-color-error"
        role="alert"
        data-wd-key="color-error"
      >
        {t("Invalid color")}
      </div>
    }
    {picker}
  </div>;
};

export default InputColor;
