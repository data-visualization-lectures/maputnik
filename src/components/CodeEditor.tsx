import InputJson from "./InputJson";
import React from "react";
import {MdClose} from "react-icons/md";
import {withTranslation, type WithTranslation} from "react-i18next";
import {type StyleSpecification} from "maplibre-gl";
import {type StyleSpecificationWithId} from "../libs/definitions";

export type CodeEditorProps = {
  value: StyleSpecification
  onChange: (value: StyleSpecificationWithId) => void
  onClose: () => void
} & WithTranslation;

const CodeEditorInternal: React.FC<CodeEditorProps> = (props) => {
  return <>
    <header className="maputnik-code-editor-header">
      <h2 className="maputnik-code-editor-header__title">{props.t("Code Editor")}</h2>
      <button
        type="button"
        className="maputnik-code-editor-header__close"
        onClick={props.onClose}
        aria-label={props.t("Close")}
        title={props.t("Close")}
        data-wd-key="code-editor:close"
      >
        <MdClose />
      </button>
    </header>
    <InputJson
      lintType="style"
      value={props.value}
      onChange={props.onChange}
      className={"maputnik-code-editor"}
    />
  </>;
};

const CodeEditor = withTranslation()(CodeEditorInternal);

export default CodeEditor;
