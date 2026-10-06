import React from "react";
import classnames from "classnames";
import {MdContentCopy, MdVisibility, MdVisibilityOff, MdDelete} from "react-icons/md";
import { IconContext } from "react-icons";
import {useSortable} from "@dnd-kit/sortable";
import {CSS} from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";

import IconLayer from "./IconLayer";
import { useTranslation } from "react-i18next";


type DraggableLabelProps = {
  layerId: string
  layerIndex: number
  layerType: string
  dragAttributes?: React.HTMLAttributes<HTMLElement>
  dragListeners?: React.HTMLAttributes<HTMLElement>
};

const DraggableLabel: React.FC<DraggableLabelProps> = (props) => {
  const {t} = useTranslation();
  const {dragAttributes, dragListeners} = props;
  return <div
    className="maputnik-layer-list-item-handle"
    {...dragAttributes}
    {...dragListeners}
    data-wd-key={"layer-list-item-handle:" + props.layerIndex}
    aria-label={t("Reorder layer {{id}}", {id: props.layerId})}
  >
    <IconLayer
      className="layer-handle__icon"
      type={props.layerType}
      style={{ width: "1em", height: "1em", verticalAlign: "middle" }}
    />
    <button type="button" className="maputnik-layer-list-item-id">
      {props.layerId}
    </button>
  </div>;
};

type IconActionProps = {
  action: string
  label: string
  onClick(event: React.MouseEvent<HTMLButtonElement>): void
  wdKey?: string
  classBlockName?: string
  classBlockModifier?: string
};

class IconAction extends React.Component<IconActionProps> {
  renderIcon() {
    switch(this.props.action) {
      case "duplicate": return <MdContentCopy />;
      case "show": return <MdVisibility />;
      case "hide": return <MdVisibilityOff />;
      case "delete": return <MdDelete />;
    }
  }

  render() {
    const {classBlockName, classBlockModifier} = this.props;

    let classAdditions = "";
    if (classBlockName) {
      classAdditions = `maputnik-layer-list-icon-action__${classBlockName}`;

      if (classBlockModifier) {
        classAdditions += ` maputnik-layer-list-icon-action__${classBlockName}--${classBlockModifier}`;
      }
    }

    return <button
      type="button"
      title={this.props.label}
      aria-label={this.props.label}
      className={`maputnik-layer-list-icon-action ${classAdditions}`}
      data-wd-key={this.props.wdKey}
      onClick={this.props.onClick}
    >
      {this.renderIcon()}
    </button>;
  }
}

type LayerListItemProps = {
  id?: string
  sortableId: string
  layerIndex: number
  layerId: string
  layerType: string
  isSelected?: boolean
  visibility?: string
  className?: string
  onLayerSelect(index: number): void;
  onLayerCopy?(...args: unknown[]): unknown
  onLayerDestroy?(...args: unknown[]): unknown
  onLayerVisibilityToggle?(...args: unknown[]): unknown
};

const LayerListItem = React.forwardRef<HTMLLIElement, LayerListItemProps>((props, ref) => {
  const { t } = useTranslation();
  const {
    isSelected = false,
    visibility = "visible",
    onLayerCopy = () => {},
    onLayerDestroy = () => {},
    onLayerVisibilityToggle = () => {},
  } = props;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id: props.sortableId});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const visibilityAction = visibility === "visible" ? "show" : "hide";
  const visibilityLabel = visibility === "visible" ? t("Hide layer") : t("Show layer");

  // Cast ref to MutableRefObject since we know from the codebase that's what's always passed
  const refObject = ref as React.MutableRefObject<HTMLLIElement | null> | null;

  const handleActionClick = (event: React.MouseEvent, handler: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    handler();
  };

  return <IconContext.Provider value={{size: "14px"}}>
    <li
      ref={(node) => {
        setNodeRef(node);
        if (refObject) {
          refObject.current = node;
        }
      }}
      style={style}
      id={props.id}
      onClick={_e => props.onLayerSelect(props.layerIndex)}
      data-wd-key={"layer-list-item:" + props.layerId}
      className={classnames({
        "maputnik-layer-list-item": true,
        "maputnik-layer-list-item-selected": isSelected,
        [props.className!]: true,
      })}>
      <DraggableLabel
        layerId={props.layerId}
        layerIndex={props.layerIndex}
        layerType={props.layerType}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
      <span style={{flexGrow: 1}} />
      <IconAction
        wdKey={"layer-list-item:" + props.layerId+":delete"}
        action={"delete"}
        label={t("Delete layer")}
        classBlockName="delete"
        onClick={e => handleActionClick(e, () => onLayerDestroy!(props.layerIndex))}
      />
      <IconAction
        wdKey={"layer-list-item:" + props.layerId+":copy"}
        action={"duplicate"}
        label={t("Duplicate layer")}
        classBlockName="duplicate"
        onClick={e => handleActionClick(e, () => onLayerCopy!(props.layerIndex))}
      />
      <IconAction
        wdKey={"layer-list-item:"+props.layerId+":toggle-visibility"}
        action={visibilityAction}
        label={visibilityLabel}
        classBlockName="visibility"
        classBlockModifier={visibilityAction}
        onClick={e => handleActionClick(e, () => onLayerVisibilityToggle!(props.layerIndex))}
      />
    </li>
  </IconContext.Provider>;
});

export default LayerListItem;
