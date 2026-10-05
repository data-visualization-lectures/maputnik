import React from "react";

import InputButton from "./InputButton";
import {MdFunctions, MdInsertChart} from "react-icons/md";
import { TbMathFunction } from "react-icons/tb";
import { Wrapper, Button, Menu, MenuItem } from "react-aria-menubutton";
import { type WithTranslation, withTranslation } from "react-i18next";

type FunctionInputButtonsInternalProps = {
  fieldSpec?: any
  onZoomClick?(): void
  onDataClick?(): void
  onExpressionClick?(): void
  onElevationClick?(): void
} & WithTranslation;

class FunctionInputButtonsInternal extends React.Component<FunctionInputButtonsInternalProps> {
  render() {
    const t = this.props.t;

    if (this.props.fieldSpec.expression?.parameters.includes("zoom")) {
      const items: {id: string, text: string, wdKey: string, handler?: () => void}[] = [
        {
          id: "expression",
          text: t("Expression…"),
          wdKey: "function-menu:expression",
          handler: this.props.onExpressionClick,
        },
      ];

      if (this.props.fieldSpec["property-type"] === "data-driven") {
        items.push({
          id: "data",
          text: t("Data stops"),
          wdKey: "function-menu:data",
          handler: this.props.onDataClick,
        });
      }

      items.push({
        id: "zoom",
        text: t("Zoom stops"),
        wdKey: "function-menu:zoom",
        handler: this.props.onZoomClick,
      });

      const handleSelection = (id: string, event: React.SyntheticEvent) => {
        event.stopPropagation();
        const item = items.find((entry) => entry.id === id);
        item?.handler?.();
      };

      return (
        <Wrapper
          className="maputnik-function-menu"
          onSelection={handleSelection}
        >
          <Button
            className="maputnik-button maputnik-make-zoom-function maputnik-function-menu__button"
            title={t("Convert property")}
            data-wd-key="function-menu"
          >
            <TbMathFunction />
            <span className="maputnik-function-menu__label">{t("fx")}</span>
          </Button>
          <Menu>
            <ul className="maputnik-function-menu__menu">
              {items.map((item) => (
                <li key={item.id}>
                  <MenuItem value={item.id} className="maputnik-function-menu__item" data-wd-key={item.wdKey}>
                    {item.id === "expression" && <TbMathFunction />}
                    {item.id === "data" && <MdInsertChart />}
                    {item.id === "zoom" && <MdFunctions />}
                    <span>{item.text}</span>
                  </MenuItem>
                </li>
              ))}
            </ul>
          </Menu>
        </Wrapper>
      );
    } else if (this.props.fieldSpec.expression?.parameters.includes("elevation")) {
      const inputElevationButton = <InputButton
        className="maputnik-make-elevation-function"
        onClick={this.props.onElevationClick}
        title={t("Convert property into a elevation function")}
        data-wd-key='make-elevation-function'
      >
        <MdFunctions />
        <span>{t("Elevation")}</span>
      </InputButton>;
      return <div>{inputElevationButton}</div>;
    } else {
      return <div></div>;
    }
  }
}

const FunctionInputButtons = withTranslation()(FunctionInputButtonsInternal);
export default FunctionInputButtons;
