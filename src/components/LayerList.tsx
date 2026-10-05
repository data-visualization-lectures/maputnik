import React, {type JSX} from "react";
import classnames from "classnames";
import lodash from "lodash";
import {MdClose} from "react-icons/md";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import LayerListGroup from "./LayerListGroup";
import LayerListItem from "./LayerListItem";
import ModalAdd from "./modals/ModalAdd";

import type {LayerSpecification, SourceSpecification} from "maplibre-gl";
import generateUniqueId from "../libs/document-uid";
import { findClosestCommonPrefix, layerPrefix } from "../libs/layer";
import { type WithTranslation, withTranslation } from "react-i18next";
import { type MappedError, type OnMoveLayerCallback } from "../libs/definitions";

type LayerListEntry = LayerSpecification & {key: string};

function layerMatchesFilter(layer: LayerSpecification, query: string, typeFilter: string): boolean {
  if (typeFilter && layer.type !== typeFilter) {
    return false;
  }
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return layer.id.toLowerCase().includes(normalizedQuery) ||
    layer.type.toLowerCase().includes(normalizedQuery);
}

type LayerListContainerProps = {
  layers: LayerSpecification[]
  selectedLayerIndex: number
  onLayersChange(layers: LayerSpecification[]): unknown
  onLayerSelect(index: number): void;
  onLayerDestroy?(...args: unknown[]): unknown
  onLayerCopy(...args: unknown[]): unknown
  onLayerVisibilityToggle(...args: unknown[]): unknown
  sources: Record<string, SourceSpecification & {layers: string[]}>;
  errors: MappedError[]
};
type LayerListContainerInternalProps = LayerListContainerProps & WithTranslation;

type LayerListContainerState = {
  collapsedGroups: {[key: string]: boolean}
  areAllGroupsExpanded: boolean
  keys: {[key: string]: number}
  isOpen: {[key: string]: boolean}
  searchQuery: string
  selectedType: string
};

// List of collapsible layer editors
class LayerListContainerInternal extends React.Component<LayerListContainerInternalProps, LayerListContainerState> {
  static defaultProps = {
    onLayerSelect: () => {},
  };
  selectedItemRef: React.RefObject<any>;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  firstMatchLayerId: string | null;

  constructor(props: LayerListContainerInternalProps) {
    super(props);
    this.selectedItemRef = React.createRef();
    this.scrollContainerRef = React.createRef();
    this.searchInputRef = React.createRef();
    this.firstMatchLayerId = null;
    this.state = {
      collapsedGroups: {},
      areAllGroupsExpanded: false,
      keys: {
        add: +generateUniqueId(),
      },
      isOpen: {
        add: false,
      },
      searchQuery: "",
      selectedType: "",
    };
  }

  toggleModal(modalName: string) {
    this.setState({
      keys: {
        ...this.state.keys,
        [modalName]: +generateUniqueId(),
      },
      isOpen: {
        ...this.state.isOpen,
        [modalName]: !this.state.isOpen[modalName]
      }
    });
  }

  toggleLayers = () => {
    let idx = 0;

    const newGroups: {[key:string]: boolean} = {};

    this.groupedLayers().forEach(layers => {
      const groupPrefix = layerPrefix(layers[0].id);
      const lookupKey = [groupPrefix, idx].join("-");


      if (layers.length > 1) {
        newGroups[lookupKey] = this.state.areAllGroupsExpanded;
      }

      layers.forEach((_layer) => {
        idx += 1;
      });
    });

    this.setState({
      collapsedGroups: newGroups,
      areAllGroupsExpanded: !this.state.areAllGroupsExpanded
    });
  };

  groupedLayers(): LayerListEntry[][] {
    const groups = [];
    const layerIdCount = new Map();

    for (let i = 0; i < this.props.layers.length; i++) {
      const origLayer = this.props.layers[i];
      const previousLayer = this.props.layers[i-1];
      layerIdCount.set(origLayer.id,
        layerIdCount.has(origLayer.id) ? layerIdCount.get(origLayer.id) + 1 : 0
      );
      const layer = {
        ...origLayer,
        key: `layers-list-${origLayer.id}-${layerIdCount.get(origLayer.id)}`,
      };
      if(previousLayer && layerPrefix(previousLayer.id) == layerPrefix(layer.id)) {
        const lastGroup = groups[groups.length - 1];
        lastGroup.push(layer);
      } else {
        groups.push([layer]);
      }
    }
    return groups;
  }

  toggleLayerGroup(groupPrefix: string, idx: number) {
    const lookupKey = [groupPrefix, idx].join("-");
    const newGroups = { ...this.state.collapsedGroups };
    if(lookupKey in this.state.collapsedGroups) {
      newGroups[lookupKey] = !this.state.collapsedGroups[lookupKey];
    } else {
      newGroups[lookupKey] = false;
    }
    this.setState({
      collapsedGroups: newGroups
    });
  }

  isCollapsed(groupPrefix: string, idx: number) {
    const collapsed = this.state.collapsedGroups[[groupPrefix, idx].join("-")];
    return collapsed === undefined ? true : collapsed;
  }

  typesInStyle(): string[] {
    const types: string[] = [];
    for (const layer of this.props.layers) {
      if (!types.includes(layer.type)) {
        types.push(layer.type);
      }
    }
    return types;
  }

  onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ searchQuery: event.target.value });
  };

  onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && this.state.searchQuery) {
      event.stopPropagation();
      this.setState({ searchQuery: "" });
    }
  };

  clearSearch = () => {
    this.setState({ searchQuery: "" }, () => {
      this.searchInputRef.current?.focus();
    });
  };

  selectTypeFilter = (type: string) => {
    this.setState({
      selectedType: this.state.selectedType === type ? "" : type
    });
  };

  shouldComponentUpdate (nextProps: LayerListContainerProps, nextState: LayerListContainerState) {
    // Always update on state change
    if (this.state !== nextState) {
      return true;
    }

    // This component tree only requires id, type, and visibility from the layers
    // objects
    function getRequiredProps(layer: LayerSpecification) {
      const out: {id: string, type: string, layout?: { visibility: any}} = {
        id: layer.id,
        type: layer.type,
      };

      if (layer.layout) {
        out.layout = {
          visibility: layer.layout.visibility
        };
      }
      return out;
    }
    const layersEqual = lodash.isEqual(
      nextProps.layers.map(getRequiredProps),
      this.props.layers.map(getRequiredProps),
    );

    function withoutLayers(props: LayerListContainerProps) {
      const out = {
        ...props
      } as LayerListContainerProps & { layers?: any };
      delete out["layers"];
      return out;
    }

    // Compare the props without layers because we've already compared them
    // efficiently above.
    const propsEqual = lodash.isEqual(
      withoutLayers(this.props),
      withoutLayers(nextProps)
    );

    const propsChanged = !(layersEqual && propsEqual);
    return propsChanged;
  }

  componentDidUpdate (prevProps: LayerListContainerProps, prevState: LayerListContainerState) {
    if (prevProps.selectedLayerIndex !== this.props.selectedLayerIndex) {
      const selectedItemNode = this.selectedItemRef.current;
      if (selectedItemNode && selectedItemNode.node) {
        const target = selectedItemNode.node;
        const options = {
          root: this.scrollContainerRef.current,
          threshold: 1.0
        };
        const observer = new IntersectionObserver(entries => {
          observer.unobserve(target);
          if (entries.length > 0 && entries[0].intersectionRatio < 1) {
            target.scrollIntoView();
          }
        }, options);

        observer.observe(target);
      }
    }

    const filterChanged =
      prevState.searchQuery !== this.state.searchQuery ||
      prevState.selectedType !== this.state.selectedType;
    if (filterChanged && this.firstMatchLayerId) {
      const root = this.scrollContainerRef.current;
      const key = "layer-list-item:" + this.firstMatchLayerId;
      const target = root?.querySelector(`[data-wd-key=${JSON.stringify(key)}]`);
      if (target) {
        target.scrollIntoView({ block: "nearest" });
      }
    }
  }

  render() {

    const listItems: JSX.Element[] = [];
    let idx = 0;
    const layersByGroup = this.groupedLayers();
    const searchQuery = this.state.searchQuery;
    const selectedType = this.state.selectedType;
    const isFiltering = Boolean(searchQuery.trim() || selectedType);
    this.firstMatchLayerId = null;
    let assignedFirstMatch = false;
    let matchCount = 0;

    layersByGroup.forEach(layers => {
      const groupPrefix = layerPrefix(layers[0].id);
      const groupStartIdx = idx;
      const visible: {layer: LayerListEntry, idx: number}[] = [];

      layers.forEach((layer) => {
        const layerIdx = idx;
        idx += 1;
        if (isFiltering && !layerMatchesFilter(layer, searchQuery, selectedType)) {
          return;
        }
        visible.push({layer, idx: layerIdx});
        matchCount += 1;
      });

      if (visible.length === 0) {
        return;
      }

      if(layers.length > 1) {
        const grp = <LayerListGroup
          data-wd-key={[groupPrefix, groupStartIdx].join("-")}
          aria-controls={visible.map(item => item.layer.key).join(" ")}
          key={`group-${groupPrefix}-${groupStartIdx}`}
          title={groupPrefix}
          isActive={isFiltering || !this.isCollapsed(groupPrefix, groupStartIdx) || visible.some(item => item.idx === this.props.selectedLayerIndex)}
          onActiveToggle={this.toggleLayerGroup.bind(this, groupPrefix, groupStartIdx)}
        />;
        listItems.push(grp);
      }

      visible.forEach((item, visibleIndex) => {
        const {layer, idx: layerIdx} = item;
        const groupIdx = findClosestCommonPrefix(this.props.layers, layerIdx);

        const layerError = this.props.errors.find(error => {
          return (
            error.parsed &&
            error.parsed.type === "layer" &&
            error.parsed.data.index == layerIdx
          );
        });

        const additionalProps: {ref?: React.RefObject<any>} = {};
        if (layerIdx === this.props.selectedLayerIndex) {
          additionalProps.ref = this.selectedItemRef;
        }

        const isFirstMatch = isFiltering && !assignedFirstMatch;
        if (isFirstMatch) {
          assignedFirstMatch = true;
          this.firstMatchLayerId = layer.id;
        }

        const listItem = <LayerListItem
          className={classnames({
            "maputnik-layer-list-item-collapsed": !isFiltering && layers.length > 1 && this.isCollapsed(groupPrefix, groupIdx) && layerIdx !== this.props.selectedLayerIndex,
            "maputnik-layer-list-item-group-last": visibleIndex === visible.length - 1 && layers.length > 1,
            "maputnik-layer-list-item--error": !!layerError,
            "maputnik-layer-list-item--first-match": isFirstMatch,
          })}
          key={layer.key}
          id={layer.key}
          layerId={layer.id}
          layerIndex={layerIdx}
          layerType={layer.type}
          visibility={(layer.layout || {}).visibility}
          isSelected={layerIdx === this.props.selectedLayerIndex}
          onLayerSelect={this.props.onLayerSelect}
          onLayerDestroy={this.props.onLayerDestroy?.bind(this)}
          onLayerCopy={this.props.onLayerCopy.bind(this)}
          onLayerVisibilityToggle={this.props.onLayerVisibilityToggle.bind(this)}
          {...additionalProps}
        />;
        listItems.push(listItem);
      });
    });

    const t = this.props.t;
    const typesInStyle = this.typesInStyle();
    const showTypeFilters = typesInStyle.length > 1;

    return <section
      className="maputnik-layer-list"
      data-wd-key="layer-list"
      role="complementary"
      aria-label={t("Layers list")}
      ref={this.scrollContainerRef}
    >
      <ModalAdd
        key={this.state.keys.add}
        layers={this.props.layers}
        sources={this.props.sources}
        isOpen={this.state.isOpen.add}
        onOpenToggle={this.toggleModal.bind(this, "add")}
        onLayersChange={this.props.onLayersChange}
      />
      <header className="maputnik-layer-list-header" data-wd-key="layer-list.header">
        <div className="maputnik-layer-list-header-row">
          <span className="maputnik-layer-list-header-title">{t("Layers")}</span>
          <span className="maputnik-space" />
          <div className="maputnik-default-property">
            <div className="maputnik-multibutton">
              <button
                id="skip-target-layer-list"
                data-wd-key="skip-target-layer-list"
                onClick={this.toggleLayers}
                className="maputnik-button">
                {this.state.areAllGroupsExpanded === true ?
                  t("Collapse")
                  :
                  t("Expand")
                }
              </button>
            </div>
          </div>
          <div className="maputnik-default-property">
            <div className="maputnik-multibutton">
              <button
                onClick={this.toggleModal.bind(this, "add")}
                data-wd-key="layer-list:add-layer"
                className="maputnik-button maputnik-button-selected">
                {t("Add Layer")}
              </button>
            </div>
          </div>
        </div>
        <div className="maputnik-layer-list-filter" role="search">
          <div className="maputnik-layer-list-search">
            <input
              ref={this.searchInputRef}
              type="search"
              className="maputnik-string maputnik-layer-list-search-input"
              value={searchQuery}
              onChange={this.onSearchChange}
              onKeyDown={this.onSearchKeyDown}
              placeholder={t("Search layers")}
              aria-label={t("Search layers")}
              data-wd-key="layer-list.search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="layer-list-search"
            />
            {searchQuery ? (
              <button
                type="button"
                className="maputnik-layer-list-search-clear"
                onClick={this.clearSearch}
                aria-label={t("Clear search")}
                data-wd-key="layer-list.search.clear"
              >
                <MdClose size={14} />
              </button>
            ) : null}
          </div>
          {showTypeFilters ? (
            <div
              className="maputnik-layer-list-type-filters"
              role="group"
              aria-label={t("Filter by type")}
            >
              <button
                type="button"
                className="maputnik-layer-list-type-chip"
                aria-pressed={!selectedType}
                data-wd-key="layer-list.filter-type:all"
                onClick={() => this.setState({ selectedType: "" })}
              >
                {t("All types")}
              </button>
              {typesInStyle.map((type) => (
                <button
                  type="button"
                  key={type}
                  className="maputnik-layer-list-type-chip"
                  aria-pressed={selectedType === type}
                  data-wd-key={"layer-list.filter-type:" + type}
                  onClick={() => this.selectTypeFilter(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      <div
        role="navigation"
        aria-label={t("Layers list")}
      >
        <ul className="maputnik-layer-list-container">
          {listItems}
        </ul>
        {isFiltering && matchCount === 0 ? (
          <p
            className="maputnik-layer-list-empty"
            role="status"
            data-wd-key="layer-list.no-results"
          >
            {t("No matching layers")}
          </p>
        ) : null}
      </div>
    </section>;
  }
}

const LayerListContainer = withTranslation()(LayerListContainerInternal);

type LayerListProps = LayerListContainerProps & {
  onMoveLayer: OnMoveLayerCallback
};

const LayerList: React.FC<LayerListProps> = (props) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over) return;

    const oldIndex = props.layers.findIndex(layer => layer.id === active.id);
    const newIndex = props.layers.findIndex(layer => layer.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      props.onMoveLayer({oldIndex, newIndex});
    }
  };

  const layerIds = props.layers.map(layer => layer.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={layerIds} strategy={verticalListSortingStrategy}>
        <LayerListContainer {...props} />
      </SortableContext>
    </DndContext>
  );
};

export default LayerList;
