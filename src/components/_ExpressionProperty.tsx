import React from "react";
import {MdDelete, MdUndo} from "react-icons/md";
import { type WithTranslation, withTranslation } from "react-i18next";

import Block from "./Block";
import InputButton from "./InputButton";
import labelFromFieldName from "../libs/label-from-field-name";
import FieldJson from "./FieldJson";
import ExpressionBuilder from "./ExpressionBuilder";
import {detectExpressionPattern, isGuidedExpressionPattern} from "../libs/expression-builder";
import type { StylePropertySpecification } from "maplibre-gl";
import { type MappedLayerErrors } from "../libs/definitions";

type ExpressionEditorTab = "builder" | "advanced";

type ExpressionPropertyInternalProps = {
  fieldName: string
  fieldType?: string
  fieldSpec?: StylePropertySpecification
  value?: any
  errors?: MappedLayerErrors
  onDelete?(...args: unknown[]): unknown
  onChange(value: object): void
  onUndo?(...args: unknown[]): unknown
  canUndo?(...args: unknown[]): unknown
  onFocus?(...args: unknown[]): unknown
  onBlur?(...args: unknown[]): unknown
} & WithTranslation;

type ExpressionPropertyState = {
  tab: ExpressionEditorTab
};

function initialTab(value: unknown): ExpressionEditorTab {
  return isGuidedExpressionPattern(detectExpressionPattern(value)) ? "builder" : "advanced";
}

class ExpressionPropertyInternal extends React.Component<ExpressionPropertyInternalProps, ExpressionPropertyState> {
  static defaultProps = {
    errors: {},
    onFocus: () => {},
    onBlur: () => {},
  };

  constructor(props: ExpressionPropertyInternalProps) {
    super(props);
    this.state = {
      tab: initialTab(props.value),
    };
  }

  setTab = (tab: ExpressionEditorTab) => {
    this.setState({tab});
  };

  render() {
    const {t, value, canUndo} = this.props;
    const undoAvailable = canUndo ? canUndo() : false;
    const undoDisabled = !undoAvailable;
    const pattern = detectExpressionPattern(value);
    const guided = isGuidedExpressionPattern(pattern);

    const deleteStopBtn = (
      <>
        {this.props.onUndo &&
          <InputButton
            key="undo_action"
            onClick={this.props.onUndo}
            disabled={undoDisabled}
            className="maputnik-delete-stop"
            title={undoAvailable ? t("Revert from expression") : t("Revert is only available for get or literal expressions")}
            aria-label={undoAvailable ? t("Revert from expression") : t("Revert is only available for get or literal expressions")}
          >
            <MdUndo />
          </InputButton>
        }
        <InputButton
          key="delete_action"
          onClick={this.props.onDelete}
          className="maputnik-delete-stop"
          title={t("Delete expression")}
          aria-label={t("Delete expression")}
        >
          <MdDelete />
        </InputButton>
      </>
    );
    let error = undefined;
    if (this.props.errors) {
      const fieldKey = this.props.fieldType ? this.props.fieldType + "." + this.props.fieldName : this.props.fieldName;
      error = this.props.errors[fieldKey];
    }
    return <Block
      fieldSpec={this.props.fieldSpec}
      label={t(labelFromFieldName(this.props.fieldName))}
      action={deleteStopBtn}
      wideMode={true}
      error={error}
    >
      <div className="maputnik-expression-editor-shell">
        <div className="maputnik-expression-tabs" role="tablist" aria-label={t("Expression editor")}>
          <InputButton
            className={this.state.tab === "builder" ? "maputnik-button-selected" : undefined}
            data-wd-key="expression-editor-tab:builder"
            aria-label={t("Builder")}
            onClick={() => this.setTab("builder")}
          >
            {t("Builder")}
          </InputButton>
          <InputButton
            className={this.state.tab === "advanced" ? "maputnik-button-selected" : undefined}
            data-wd-key="expression-editor-tab:advanced"
            aria-label={t("Advanced")}
            onClick={() => this.setTab("advanced")}
          >
            {t("Advanced")}
          </InputButton>
        </div>
        {this.state.tab === "builder" &&
          <ExpressionBuilder
            value={value}
            fieldName={this.props.fieldName}
            fieldSpec={this.props.fieldSpec}
            onChange={this.props.onChange}
          />
        }
        {this.state.tab === "advanced" &&
          <>
            {!guided &&
              <p className="maputnik-expression-builder__hint">
                {t("This expression is not supported by the guided builder. Edit it as JSON.")}
              </p>
            }
            <FieldJson
              lintType="expression"
              spec={this.props.fieldSpec}
              className="maputnik-expression-editor"
              onFocus={this.props.onFocus}
              onBlur={this.props.onBlur}
              value={value}
              onChange={this.props.onChange}
            />
          </>
        }
      </div>
    </Block>;
  }
}

const ExpressionProperty = withTranslation()(ExpressionPropertyInternal);
export default ExpressionProperty;
