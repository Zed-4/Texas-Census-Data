import Head from 'next/head';
import MapGL, { Source, Layer /* Popup */ } from 'react-map-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Popup } from 'mapbox-gl';
import axios from 'axios';
import _ from 'lodash';
import classNames from 'classnames';
import { renderToString } from 'react-dom/server';
import Image from 'next/image';

import type { MapRef, MapboxGeoJSONFeature, MapLayerMouseEvent } from 'react-map-gl';
import type { NextPage } from 'next';

const { NEXT_PUBLIC_API_BASE_URL, } = process.env;

type ApiMapDatumDto = {
  geo_id: string;
  acs_table_id: string;
  acs_column_id: string;
  value: string;
  display_value: string;
  geo_id_parts: string[];
  legend: AcsMapDataLegendDto;
};

type AcsMapDataLegendDto = {
  min: string;
  max: string;
  label: string;
  min_label: string;
  max_label: string;
  color: string;
};

type AcsMapDataResponseDto = {
  data: ApiMapDatumDto[];
  metadata: {
    legend: AcsMapDataLegendDto[];
  };
};

type AcsColumnDto = {
  acs_column_id: string;
  display_name: string;
};

type AcsColumnDataResponseDto = {
  data: AcsColumnDto[];
};

const Home: NextPage = () => {
  // ---
  // we utilize `useRef` for:
  // - values that stay the same between react component renders
  // - values that DO NOT need react changes tracking
  // - values when they are changed they don't trigger react component re-render!!!!
  //
  // for all other values we utilize `useState`
  // ---
  const mapRef = useRef<MapRef>();

  const featureHoveredCounty = useRef<MapboxGeoJSONFeature>();
  const featureHoveredTract = useRef<MapboxGeoJSONFeature>();

  // const hoveredLegentItem = useRef<AcsMapDataLegendDto>();

  const [hoveredLegentItem, setHoveredLegentItem] = useState<AcsMapDataLegendDto>();

  const mapPopup = useRef<Popup>(new Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 25,
  }));

  const [acsColumns, setAcsColumns] = useState<AcsColumnDto[]>();
  const [selectedAcsColumn, setSelectedAcsColumn] = useState<AcsColumnDto>();
  const [censusData, setCensusData] = useState<Record<string, ApiMapDatumDto>>();
  const [legend, setLegend] = useState<AcsMapDataLegendDto[]>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data, } = await axios.get<AcsColumnDataResponseDto>(`${NEXT_PUBLIC_API_BASE_URL!}/api/v1/acs_columns`);

      setAcsColumns(data.data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedAcsColumn) {
        return;
      }

      setLoading(true);

      const { data, } = await axios.get<AcsMapDataResponseDto>(`${NEXT_PUBLIC_API_BASE_URL!}/api/v1/acs_map_data`, {
        params: {
          q: {
            acs_column_id_eq: selectedAcsColumn.acs_column_id,
          },
        },
      });

      const censusDataInternal: Record<string, ApiMapDatumDto> = {};

      _.forEach(data.data, mapDatum => {
        if (mapDatum.geo_id_parts?.length !== 2 || !mapDatum.legend) {
          return;
        }

        censusDataInternal[mapDatum.geo_id_parts[1]] = mapDatum;
      });

      setLegend(data.metadata.legend);
      setCensusData(censusDataInternal);
      setLoading(false);
    })();
  }, [selectedAcsColumn]);

  // ---

  const onMapLoadFilterOutStates = useCallback(() => {
    mapRef.current?.getMap().setFilter('texas-counties-line', ['==', 'STATEFP', '48']);
    mapRef.current?.getMap().setFilter('texas-counties-fill', ['==', 'STATEFP', '48']);
  }, []);

  // actual map event listener function for when mouse moves over map for counties
  const onMapMouseMoveCounties = useCallback((e: MapLayerMouseEvent) => {
    if (featureHoveredCounty.current) {
      mapRef.current?.setFeatureState(featureHoveredCounty.current, { hover: false, });
    }

    featureHoveredCounty.current = e.features?.[0];

    if (featureHoveredCounty.current && mapRef.current && censusData && !_.isEmpty(censusData)) {
      const mapDatum = censusData[featureHoveredCounty.current.properties!.GEOID];

      mapPopup.current.addTo(mapRef.current.getMap());
      mapPopup.current.setLngLat(e.lngLat);
      mapPopup.current.setHTML(
        renderToString(
          <div className='flex flex-col'>
            <div>{mapDatum?.display_value}</div>
            <div>{featureHoveredCounty.current.properties?.NAMELSAD}</div>
          </div>
        )
      );

      mapRef.current?.setFeatureState(featureHoveredCounty.current, { hover: true, });
    }
  }, [censusData]);

  const onMapMouseLeaveCounties = useCallback((e: MapLayerMouseEvent) => {
    mapPopup.current.remove();
  }, []);

  // ---

  // actual map event listener function for when mouse moves over map for tracts
  const onMapMouseMoveTracts = useCallback((e: MapLayerMouseEvent) => {
    if (featureHoveredTract.current) {
      mapRef.current?.setFeatureState(featureHoveredTract.current, { hover: false, });
    }

    featureHoveredTract.current = e.features?.[0];

    if (featureHoveredTract.current && mapRef.current) {
      mapPopup.current.addTo(mapRef.current.getMap());

      mapPopup.current.setLngLat(e.lngLat);
      mapPopup.current.setText(featureHoveredTract.current.properties?.NAMELSAD);
      mapRef.current?.setFeatureState(featureHoveredTract.current, { hover: true, });
    }
  }, []);

  const onMapMouseLeaveTracts = useCallback((e: MapLayerMouseEvent) => {
    mapPopup.current.remove();
  }, []);

  const addMapListeners = useCallback(() => {
    mapRef.current?.on('mousemove', 'texas-counties-fill', onMapMouseMoveCounties);
    mapRef.current?.on('mouseleave', 'texas-counties-fill', onMapMouseLeaveCounties);
    mapRef.current?.on('mousemove', 'texas-census-tracts-fill', onMapMouseMoveTracts);
    mapRef.current?.on('mouseleave', 'texas-census-tracts-fill', onMapMouseLeaveTracts);
    mapRef.current?.getMap()?.on('load', onMapLoadFilterOutStates);
  }, [onMapLoadFilterOutStates, onMapMouseLeaveCounties, onMapMouseLeaveTracts, onMapMouseMoveCounties, onMapMouseMoveTracts]);

  const removeMapListeners = useCallback(() => {
    mapRef.current?.off('mousemove', 'texas-counties-fill', onMapMouseMoveCounties);
    mapRef.current?.off('mouseleave', 'texas-counties-fill', onMapMouseLeaveCounties);
    mapRef.current?.off('mousemove', 'texas-census-tracts-fill', onMapMouseMoveTracts);
    mapRef.current?.off('mouseleave', 'texas-census-tracts-fill', onMapMouseLeaveTracts);
    mapRef.current?.getMap()?.off('load', onMapLoadFilterOutStates);
  }, [onMapLoadFilterOutStates, onMapMouseLeaveCounties, onMapMouseLeaveTracts, onMapMouseMoveCounties, onMapMouseMoveTracts]);

  const onMouseEnterLegendItem = (legendItem: AcsMapDataLegendDto) => () => {
    // hoveredLegentItem.current = legendItem;
    setHoveredLegentItem(legendItem);
  };

  const onMouseLeaveLegendItem = () => {
    // hoveredLegentItem.current = undefined;
    setHoveredLegentItem(undefined);
  };

  useEffect(() =>
    // on react component unmount remove map listeners
    () => {
      mapRef.current?.off('mousemove', 'texas-counties-fill', onMapMouseMoveCounties);
      mapRef.current?.off('mouseleave', 'texas-counties-fill', onMapMouseLeaveCounties);
      mapRef.current?.off('mousemove', 'texas-census-tracts-fill', onMapMouseMoveTracts);
      mapRef.current?.off('mouseleave', 'texas-census-tracts-fill', onMapMouseLeaveTracts);
    }
  , [onMapMouseLeaveCounties, onMapMouseLeaveTracts, onMapMouseMoveCounties, onMapMouseMoveTracts]);

  useEffect(() => {
    removeMapListeners();
    addMapListeners();
  }, [addMapListeners, censusData, removeMapListeners, selectedAcsColumn, loading]);

  return (
    <>
      <Head>
        <title>Texas Census Map</title>
        <meta name='description' content='Texas Census Map' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      {loading ? (
        <div className='absolute w-screen h-screen z-50 bg-slate-800 bg-opacity-75 flex justify-center items-center'>
          <div className='bg-slate-800 rounded-lg border border-slate-900 p-4'>
            <svg className='inline Żw-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300' viewBox='0 0 100 101' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z' fill='currentColor'/>
              <path d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z' fill='currentFill'/>
            </svg>
          </div>
        </div>
      ) : null}
      <div className='w-screen h-screen flex flex-row'>
        <div className='w-1/3 bg-slate-900 overflow-y-auto border-r-slate-700 border-r-4'>
          <div className='space-y-2 py-2 px-5'>
            {_.map(acsColumns, acsColumn => {
              const isActive = acsColumn.acs_column_id === selectedAcsColumn?.acs_column_id;

              return (
                <div
                  key={acsColumn.acs_column_id}
                  className={
                    classNames(
                      'flex flex-col px-5 py-3 rounded-lg cursor-pointer',
                      {
                        'bg-slate-600': isActive,
                        'bg-slate-800': !isActive,
                      }
                    )
                  }
                  onClick={() => {
                    setSelectedAcsColumn(acsColumn);
                  }}
                >
                  <div className={
                    classNames(
                      'text-slate-200 text',
                      {
                        'underline underline-offset-2': isActive,
                      }
                    )
                  }>{acsColumn.display_name}</div>
                  <div className='text-slate-400 text-xs font-semibold'>{acsColumn.acs_column_id}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className='w-2/3 h-full relative'>
          <MapGL
            id='map'
            ref={ref => {
              if (mapRef.current ?? !ref) {
                return;
              }

              mapRef.current = ref;

              addMapListeners();
            }}
            mapboxAccessToken='pk.eyJ1Ijoic3licnNjcjFiZXIiLCJhIjoiY2w5MWx5NzdkMDJwcDNubW80aDRxdXphMSJ9.UoHrd8kfbPjsS_p8TX6Y4g'
            initialViewState={{
              longitude: -96.911292,
              latitude: 33.225076,
              zoom: 5,
            }}
            mapStyle='mapbox://styles/sybrscr1ber/cl91m1jq7001k15o9hwz9vvhs'
            minZoom={4}
            maxZoom={12}
          >
            <div
              className='absolute top-8 right-4 bg-slate-500 bg-opacity-40 rounded-lg z-40 cursor-pointer'
              onClick={() => {
                setCensusData(undefined);
                setSelectedAcsColumn(undefined);
              }}
            >
              <Image
                src='/Logo 2.0.png'
                alt='logo'
                width={100}
                height={90}
              />
            </div>
            <div className='absolute bottom-8 right-4 z-40 bg-slate-800 w-[280px] rounded p-2'>
              <div className='uppercase text-slate-400 tracking-wider mb-1'>Legend</div>
              {_.map(legend, legendItem => (
                <div
                  className='flex items-center hover:cursor-pointer group'
                  key={legendItem.color}
                  onMouseEnter={onMouseEnterLegendItem(legendItem)}
                  onMouseLeave={onMouseLeaveLegendItem}
                >
                  <div className='w-[16px] h-[16px] mr-3' style={{ backgroundColor: legendItem.color, }}></div>
                  <div className='flex-1 text-lg text-slate-300 group-hover:font-bold'>{legendItem.label}</div>
                </div>
              ))}
            </div>
            <Source
              id='texas-census-tracts'
              type='vector'
              // url='mapbox://sybrscr1ber.texas-tigerline'
              url='mapbox://sybrscr1ber.39x642li'
            >
              <Layer
                minzoom={10}
                maxzoom={13}
                id='texas-census-tracts-line'
                source='texas-census-tracts'
                source-layer='tl_2021_48_tract-6qxgy9'
                type='line'
                paint={{
                  'line-color': '#0f0',
                  'line-opacity': 0.3,
                  'line-width': 1,
                }}
              />
              <Layer
                minzoom={10}
                maxzoom={13}
                id='texas-census-tracts-fill'
                source='texas-census-tracts'
                source-layer='tl_2021_48_tract-6qxgy9'
                type='fill'
                paint={{
                  'fill-color': '#0f0',
                  'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    0.2,
                    0.05
                  ],
                }}
              />
            </Source>
            <Source
              id='texas-counties'
              type='vector'
              // url='mapbox://sybrscr1ber.texas-tigerline'
              url='mapbox://sybrscr1ber.8b5bbxjx'
            >
              <Layer
                minzoom={5}
                maxzoom={10}
                id='texas-counties-line'
                source='texas-counties'
                // source-layer='tl_2021_tx_counties'
                source-layer='tl_2021_us_county-1p72rf'
                type='line'
                paint={{
                  'line-color': '#ffffff',
                  // 'line-color': hoveredLegentItem ? [
                  //   'case',
                  //   [
                  //     '==',
                  //     [
                  //       'get',
                  //       'label',
                  //       [
                  //         'get',
                  //         'legend',
                  //         [
                  //           'get',
                  //           ['get', 'GEOID'],
                  //           ['literal', censusData]
                  //         ]
                  //       ]
                  //     ],
                  //     [
                  //       'get',
                  //       'label',
                  //       ['literal', hoveredLegentItem]
                  //     ]
                  //   ],
                  //   '#ffffff',
                  //   '#ff0000'
                  // ] : '#ffffff',
                  'line-opacity': 0.5,
                  'line-width': 1,
                }}
              />
              <Layer
                minzoom={5}
                maxzoom={10}
                id='texas-counties-fill'
                source='texas-counties'
                source-layer='tl_2021_us_county-1p72rf'
                type='fill'
                paint={{
                  'fill-color': censusData ? [
                    'get',
                    'color',
                    [
                      'get',
                      'legend',
                      [
                        'get',
                        ['get', 'GEOID'],
                        ['literal', censusData]
                      ]
                    ]
                  ] : '#ffffff',
                  'fill-opacity': hoveredLegentItem ? [
                    'case',
                    [
                      '==',
                      [
                        'get',
                        'label',
                        [
                          'get',
                          'legend',
                          [
                            'get',
                            ['get', 'GEOID'],
                            ['literal', censusData]
                          ]
                        ]
                      ],
                      [
                        'get',
                        'label',
                        ['literal', hoveredLegentItem]
                      ]
                    ],
                    0.55,
                    0.3
                  ] : [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    0.55,
                    0.3
                  ],
                  // 'fill-opacity': [
                  //   'case',
                  //   ['boolean', ['feature-state', 'hover'], false],
                  //   0.5,
                  //   0.3
                  // ],
                }}
              />
            </Source>
          </MapGL>
        </div>
      </div>
    </>
  );
};

export default Home;
