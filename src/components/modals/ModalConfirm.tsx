import React from "react";
import { type WithTranslation, withTranslation } from "react-i18next";

import InputButton from "../InputButton";
import Modal from "./Modal";


type ModalConfirmInternalProps = {
  "data-wd-key"?: string
  isOpen: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onCancel(): void
  onConfirm(): void
} & WithTranslation;


class ModalConfirmInternal extends React.Component<ModalConfirmInternalProps> {
  render() {
    const t = this.props.t;
    const wdKey = this.props["data-wd-key"] || "modal:confirm";

    return <Modal
      data-wd-key={wdKey}
      isOpen={this.props.isOpen}
      title={this.props.title}
      onOpenToggle={this.props.onCancel}
    >
      <p>{this.props.message}</p>
      <p className="maputnik-dialog__buttons">
        <InputButton
          data-wd-key={wdKey + ".cancel"}
          onClick={this.props.onCancel}
        >
          {t("Cancel")}
        </InputButton>
        <InputButton
          data-wd-key={wdKey + ".confirm"}
          className="maputnik-button-selected"
          onClick={this.props.onConfirm}
        >
          {this.props.confirmLabel || t("Delete")}
        </InputButton>
      </p>
    </Modal>;
  }
}

const ModalConfirm = withTranslation()(ModalConfirmInternal);
export default ModalConfirm;
