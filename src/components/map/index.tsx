/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nockeck
import React from 'react';
import { connect } from 'unistore/react';
import Actions from '../../state/Actions';
const { SNOWPACK_PUBLIC_API_KEY } = import.meta.env;
import styled from 'styled-components';
// import { isMobile } from 'react-device-detect';
import { StaticMap, GeolocateControl, NavigationControl } from 'react-map-gl';
import DeckGL, { GeoJsonLayer } from 'deck.gl';
import store from '../../state/Store';
import { wateredTreesSelector } from '../../state/Selectors';
import {
  // fetchAPI,
  interpolateColor,
  hexToRgb,
  // checkGeolocationFeature,
} from '../../utils';
import { HoverObject } from './HoverObject';
import { Generic } from '../../common/interfaces';
import {
  RGBAColor,
  defaultColor,
  brokenColor,
  workingColor,
  lockedColor,
} from './colors';
interface StyledProps {
  isNavOpen?: boolean;
}
const isMobile = false;

const ControlWrapper = styled.div<StyledProps>`
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 2;
  transition: transform 500ms;

  @media screen and (min-width: ${p => p.theme.screens.tablet}) {
    transform: ${props =>
      props.isNavOpen ? 'translate3d(350px, 0, 0)' : 'none'};
  }
`;

let map = null;
let selectedStateId = false;
const MAPBOX_TOKEN = SNOWPACK_PUBLIC_API_KEY;
const pumpsColor: (info: Generic) => RGBAColor = info => {
  if (info === undefined) {
    return defaultColor.rgba;
  }
  if (info.properties['pump:status']) {
    const status = info.properties['pump:status'];
    switch (status) {
      case 'unbekannt': {
        return defaultColor.rgba;
      }
      case 'defekt': {
        return brokenColor.rgba;
      }
      case 'funktionsfähig': {
        return workingColor.rgba;
      }
      case 'verriegelt': {
        return lockedColor.rgba;
      }

      default: {
        return defaultColor.rgba;
      }
    }
  }
  return defaultColor.rgba;
};

class DeckGLMap extends React.Component {
  constructor(props) {
    super(props);

    // this.geoLocationAvailable = false;

    this.state = {
      isHovered: false,
      hoverObjectPointer: [],
      hoverObjectMessage: '',
      hoveredObject: null,
      data: null,
      included: null,
      cursor: 'grab',
      geoLocationAvailable: false,
    };

    this._onClick = this._onClick.bind(this);
    this._updateStyles = this._updateStyles.bind(this);
    this._deckClick = this._deckClick.bind(this);
    this._renderTooltip = this._renderTooltip.bind(this);
    this._getFillColor = this._getFillColor.bind(this);
    this.setCursor = this.setCursor.bind(this);
  }

  _renderLayers() {
    const {
      //@ts-expect-error
      data,
      //@ts-expect-error

      rainGeojson,
      //@ts-expect-error

      treesVisible,
      //@ts-expect-error

      pumpsVisible,
      //@ts-expect-error
      rainVisible,
      //@ts-ignore

      pumps,
    } = this.props;

    if (data && rainGeojson && pumps) {
      const layers = [
        new GeoJsonLayer({
          id: 'geojson',
          data: isMobile ? [] : data,
          opacity: 1,
          //@ts-ignore

          getLineWidth: (info: any) => {
            //@ts-ignore

            const { selectedTree } = this.props;
            const id = info.properties['id'];

            if (selectedTree) {
              if (id === selectedTree.id) {
                return 2;
              } else {
                return 0;
              }
            } else {
              return 0;
            }
          },
          getLineColor: [247, 105, 6, 255],
          visible: treesVisible,
          filled: true,
          parameters: {
            depthTest: false,
          },
          pickable: true,
          getRadius: 3,
          type: 'circle',
          pointRadiusMinPixels: 0.5,
          autoHighlight: true,
          highlightColor: [200, 200, 200, 255],
          transitions: {
            getFillColor: 500,
          },
          getFillColor: info => {
            const {
              // wateredTrees,
              // AppState,
              //@ts-ignore

              ageRange,
              //@ts-ignore

              dataView,
              //@ts-ignore

              communityData,
            } = this.props;
            const { properties } = info;
            const { id, radolan_sum, age } = properties;

            if (dataView === 'watered' && communityData[id]) {
              return communityData[id].watered
                ? [53, 117, 177, 200]
                : [0, 0, 0, 0];
            }

            if (dataView === 'adopted' && communityData[id]) {
              return communityData[id].adopted
                ? [0, 128, 128, 200]
                : [0, 0, 0, 0];
            }

            if (dataView === 'adopted' || dataView === 'watered') {
              return [0, 0, 0, 0];
            }

            if (age >= ageRange[0] && age <= ageRange[1]) {
              const interpolated = interpolateColor(radolan_sum);
              const hex = hexToRgb(interpolated);

              return hex;
            }

            if (Number.isNaN(age)) {
              // const interpolated = interpolateColor(radolan_sum);
              // const hex = hexToRgb(interpolated);
              return [200, 200, 200, 0];
              // return hex;
            }

            return [200, 200, 200, 0];
          },
          onClick: info => {
            //@ts-ignore

            const { setDetailRouteWithListPath } = this.props;
            this._onClick(info.x, info.y, info.object);

            if (info.object !== undefined) {
              store.setState({
                highlightedObject: info.object.properties['id'],
              });
              setDetailRouteWithListPath(info.object.properties.id);
            }
          },

          updateTriggers: {
            getFillColor: [
              //@ts-ignore

              this.props.wateredTrees,
              //@ts-ignore

              this.props.highlightedObject,
              //@ts-ignore

              this.props.ageRange,
              //@ts-ignore

              this.props.dataView,
            ],
            //@ts-ignore

            getLineWidth: [this.props.selectedTree],
          },
        }),
        new GeoJsonLayer({
          id: 'rain',
          data: rainGeojson,
          opacity: 0.95,
          visible: rainVisible,
          stroked: false,
          filled: true,
          extruded: true,
          wireframe: true,
          getElevation: 1,
          getFillColor: f => {
            /**
             * Apparently DWD 1 is not 1ml but 0.1ml
             * We could change this in the database, but this would mean,
             * transferring 625.000 "," characters, therefore,
             * changing it client-side makes more sense.
             */
            const interpolated = interpolateColor(f.properties.data[0] / 10);
            const hex = hexToRgb(interpolated);
            return hex;
          },
          pickable: true,
        }),
        new GeoJsonLayer({
          id: 'pumps',
          data: pumps,
          opacity: 1,
          visible: pumpsVisible,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: true,
          getElevation: 1,
          getLineColor: [0, 0, 0, 200],
          // info => {
          //   const defaultColor = [44, 48, 59, 200];
          //   const brokenColor = [207, 222, 231, 200];
          //   const workingColor = [10, 54, 157, 200];
          //   const lockedColor = [207, 222, 231, 200];

          //   if (info === undefined) {
          //     return defaultColor;
          //   }
          //   if (info.properties['pump:status']) {
          //     const status = info.properties['pump:status'];
          //     switch (status) {
          //       case 'unbekannt': {
          //         return defaultColor;
          //       }
          //       case 'defekt': {
          //         return brokenColor;
          //       }
          //       case 'funktionsfähig': {
          //         return workingColor;
          //       }
          //       case 'locked': {
          //         return lockedColor;
          //       }
          //     }
          //   }
          //   return [44, 48, 59, 200];
          // },
          getFillColor: pumpsColor, //[255, 255, 255, 255],
          getRadius: 9,
          pointRadiusMinPixels: 4,
          pickable: true,
          lineWidthScale: 3,
          lineWidthMinPixels: 1.5,
          onHover: info => {
            if (info.object === undefined) {
              this.setState({ isHovered: false });
              return;
            }
            this.setState({ isHovered: true });
            this.setState({
              hoverObjectMessage: info.object.properties['pump:status'],
            });
            this.setState({ hoverObjectPointer: [info.x, info.y] });
          },
        }),
      ];

      return layers;
    }
  }

  _deckClick(event) {
    if (isMobile) {
      if (selectedStateId) {
        map.setFeatureState(
          { sourceLayer: 'original', source: 'trees', id: selectedStateId },
          { select: false }
        );
        selectedStateId = null;
      }
      const features = map.queryRenderedFeatures([event.x, event.y], {
        layers: ['trees'],
      });
      if (features.length > 0) {
        //@ts-ignore

        const { setDetailRouteWithListPath } = this.props;
        this._onClick(event.x, event.y, features[0]);

        store.setState({
          highlightedObject: features[0].properties['id'],
        });

        setDetailRouteWithListPath(features[0].properties.id);

        map.setFeatureState(
          { sourceLayer: 'original', source: 'trees', id: features[0].id },
          { select: true }
        );
        selectedStateId = features[0].id;
      }
    }
  }

  async selectTree(treeId: string) {
    //@ts-ignore

    const { setViewport } = this.props;
    store.setState({ selectedTreeState: 'LOADING' });
    const { getTree } = Actions(store);

    try {
      const { treeLastWatered, selectedTree } = await getTree(treeId);
      const commonState = {
        treeLastWatered,
        selectedTreeState: 'LOADED' as const,
      };
      store.setState(
        selectedTree
          ? { ...commonState, selectedTree }
          : { ...commonState, highlightedObject: undefined }
      );

      if (!selectedTree) return { treeLastWatered };

      setViewport([parseFloat(selectedTree.lat), parseFloat(selectedTree.lng)]);
      return { treeLastWatered, selectedTree };
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }
  //@ts-ignore

  _onClick(_x?: number, _y?: number, object) {
    //@ts-ignore

    const { setViewport, setDetailRouteWithListPath } = this.props;

    setViewport(object.geometry.coordinates);
    const id: string = object.properties.id;
    store.setState({
      highlightedObject: id,
    });
    setDetailRouteWithListPath(id);
  }

  _renderTooltip() {
    //@ts-ignore

    const { hoveredObject } = this.state;

    if (hoveredObject != null) {
      this.setState({ hoveredObject });
    }
  }

  setCursor(val) {
    if (val) {
      this.setState({ cursor: 'pointer' });
    } else {
      this.setState({ cursor: 'grab' });
    }
  }
  //@ts-ignore

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _getFillColor() {}

  _onload(evt) {
    map = evt.target;
    // const insertBefore = map.getStyle();

    const firstLabelLayerId = map
      .getStyle()
      .layers.find(layer => layer.type === 'symbol').id;

    if (!isMobile) {
      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 0,
          paint: {
            'fill-extrusion-color': '#FFF',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.3,
          },
        },
        firstLabelLayerId
      );
    } else {
      // disable map rotation using right click + drag
      map.dragRotate.disable();

      // disable map rotation using touch rotation gesture
      map.touchZoomRotate.disableRotation();

      map.addSource('trees', {
        type: 'vector',
        url: 'mapbox://technologiestiftung.trees_s3',
        minzoom: 11,
        maxzoom: 20,
      });

      map.addLayer({
        id: 'trees',
        type: 'circle',
        source: 'trees',
        'source-layer': 'original',
        paint: {
          'circle-radius': {
            base: 1.75,
            stops: [
              [11, 1],
              [22, 100],
            ],
          },
          'circle-opacity': 1,
          'circle-stroke-color': 'rgba(247, 105, 6, 1)',
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            'rgba(200,200,200,1)',
            [
              'interpolate',
              ['linear'],
              ['get', 'radolan_sum'],
              0,
              interpolateColor(0),
              600,
              interpolateColor(60),
              1200,
              interpolateColor(120),
              1800,
              interpolateColor(180),
              2400,
              interpolateColor(240),
              3000,
              interpolateColor(300),
            ],
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'select'], false],
            15,
            0,
          ],
        },
      });
    }

    store.setState({ isTreeMapLoading: false });
  }

  _updateStyles(prevProps) {
    if (map && isMobile) {
      //@ts-ignore

      if (this.props.selectedTree && selectedStateId) {
        // This replicates the original interaction,
        // but i believe leaving the highlight on the marker
        // even if the info window closes, makes more sense on mobile
        // map.setFeatureState(
        //   { sourceLayer: 'original', source: 'trees', id: selectedStateId },
        //   { select: false }
        // );
        // selectedStateId = null;
      }
      //@ts-ignore

      if (!this.props.treesVisible) {
        map.setLayoutProperty('trees', 'visibility', 'none');
      } else {
        map.setLayoutProperty('trees', 'visibility', 'visible');
      }
      //@ts-ignore

      if (prevProps.ageRange !== this.props.ageRange) {
        map.setPaintProperty('trees', 'circle-opacity', [
          'case',
          //@ts-ignore

          ['>=', ['get', 'age'], this.props.ageRange[0]],

          //@ts-ignore

          ['case', ['<=', ['get', 'age'], this.props.ageRange[1]], 1, 0],
          0,
        ]);
      }
      //@ts-ignore

      if (this.props.dataView === 'watered') {
        // TODO: check if there is a performance up for any of the two
        // ['in', ['get', 'id'], ['literal', [1, 2, 3]]]
        const filter = [
          'match',
          ['get', 'id'],
          //@ts-ignore

          this.props.communityDataWatered,
          true,
          false,
        ];
        map.setFilter('trees', filter);
        //@ts-ignore
      } else if (this.props.dataView === 'adopted') {
        const filter = [
          'match',
          ['get', 'id'],
          //@ts-ignore

          this.props.communityDataAdopted,
          true,
          false,
        ];
        map.setFilter('trees', filter);
      } else {
        map.setFilter('trees', null);
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (map) {
      const mapProps = [
        'wateredTrees',
        'highlightedObject',
        'ageRange',
        'dataView',
        'selectedTree',
        'treesVisible',
      ];
      let changed = false;
      mapProps.forEach(prop => {
        if (prevProps[prop] !== this.props[prop]) {
          changed = true;
        }
      });
      if (changed) {
        this._updateStyles(prevProps);
      }
      //@ts-ignore
      if (
        prevProps.highlightedObject !==
          //@ts-ignore

          this.props.highlightedObject &&
        //@ts-ignore
        this.props.highlightedObject
      ) {
        //@ts-ignore

        this.selectTree(this.props.highlightedObject);
      }
    }
  }

  handleDrag(e) {
    setTimeout(() => {
      //@ts-ignore

      this.props.setView(e.viewstate);
    }, 2000);
  }

  // componentDidMount() {
  //   checkGeolocationFeature(
  //     error => {
  //       console.error(error);
  //     },
  //     () => {
  //       this.setState({ ...this.state, geoLocationAvailable: true });
  //     }
  //   );
  // }

  render() {
    const {
      //@ts-ignore

      viewport,
      //@ts-ignore

      controller = true,
      //@ts-ignore

      baseMap = true,
      //@ts-ignore

      isTreeDataLoading,
      //@ts-ignore

      isNavOpen,
      //@ts-ignore

      setViewport,
      //@ts-ignore

      setView,
      //@ts-ignore

      overlay,
    } = this.props;

    if (isTreeDataLoading) {
      return <span>Lade Berlins Baumdaten ...</span>;
    } else if (!isTreeDataLoading) {
      return (
        <>
          {/* THis code below could be used to display some info for the pumps */}
          {isMobile === false &&
            //@ts-ignore

            this.state.isHovered === true &&
            //@ts-ignore

            this.state.hoverObjectPointer.length === 2 && (
              <HoverObject
                //@ts-ignore

                message={this.state.hoverObjectMessage}
                //@ts-ignore

                pointer={this.state.hoverObjectPointer}
              ></HoverObject>
            )}
          <DeckGL
            layers={this._renderLayers()}
            initialViewState={viewport}
            viewState={viewport}
            getCursor={e => {
              //@ts-ignore

              return this.state.cursor;
            }}
            //@ts-ignore
            onHover={(info, _event) => {
              this.setCursor(info.layer);
            }}
            onClick={this._deckClick}
            onViewStateChange={e => this.handleDrag(e)}
            controller={controller}
          >
            {baseMap && (
              // @ts-ignore
              <StaticMap
                reuseMaps
                mapStyle='mapbox://styles/technologiestiftung/ckke3kyr00w5w17mytksdr3ro'
                preventStyleDiffing={true}
                mapboxApiAccessToken={MAPBOX_TOKEN}
                onLoad={this._onload.bind(this)}
              >
                {!overlay && (
                  <ControlWrapper isNavOpen={isNavOpen}>
                    <GeolocateControl
                      positionOptions={{ enableHighAccuracy: true }}
                      trackUserLocation={isMobile ? true : false}
                      showUserLocation={true}
                      onGeolocate={posOptions => {
                        setViewport([
                          //@ts-ignore
                          posOptions.coords.longitude,
                          //@ts-ignore
                          posOptions.coords.latitude,
                        ]);
                      }}
                    />
                    <NavigationControl
                      onViewStateChange={e => setView(e.viewState)}
                    />
                  </ControlWrapper>
                )}
              </StaticMap>
            )}
          </DeckGL>
        </>
      );
    }
  }
}

export default connect(
  state => ({
    data: state.data,
    rainGeojson: state.rainGeojson,
    dataView: state.dataView,
    pumps: state.pumps,
    pumpsVisible: state.pumpsVisible,
    isTreeDataLoading: state.isTreeDataLoading,
    isNavOpen: state.isNavOpen,
    overlay: state.overlay,
    wateredTrees: wateredTreesSelector(state),
    state: state,
    highlightedObject: state.highlightedObject,
    ageRange: state.ageRange,
    communityData: state.communityData,
    communityDataWatered: state.communityDataWatered,
    communityDataAdopted: state.communityDataAdopted,
    user: state.user,
    AppState: state.AppState,
    rainVisible: state.rainVisible,
    treesVisible: state.treesVisible,
    viewport: state.viewport,
    selectedTree: state.selectedTree,
  }),
  Actions
  // @ts-ignore
)(DeckGLMap);
