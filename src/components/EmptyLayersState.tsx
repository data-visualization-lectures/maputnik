import React from "react";
import { useTranslation } from "react-i18next";


type EmptyLayersStateProps = {
  onAddLayer(): void
  wdKey?: string
  addLayerWdKey?: string
  skipTargetId?: string
};

const EmptyLayersState: React.FC<EmptyLayersStateProps> = (props) => {
  const { t } = useTranslation();

  return <div
    className="maputnik-empty-layers"
    data-wd-key={props.wdKey || "empty-layers"}
  >
    <p className="maputnik-empty-layers__title">{t("No layers yet")}</p>
    <p className="maputnik-empty-layers__hint">{t("Add a layer to start editing this style.")}</p>
    <button
      id={props.skipTargetId}
      type="button"
      className="maputnik-button maputnik-button-selected"
      data-wd-key={props.addLayerWdKey || "empty-layers:add-layer"}
      onClick={props.onAddLayer}
    >
      {t("Add Layer")}
    </button>
  </div>;
};

export default EmptyLayersState;
