import React, { useState, useEffect, useRef, useCallback } from 'react';
import useGoogleMaps from '@/lib/useGooglemaps';

interface Location {
  description: string;
  lat: number;
  lng: number;
}

interface LocationDropdownMapProps {
  value?: Location[];
  onChange?: (locations: Location[]) => void;
}

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

export default function LocationDropdownMap({
  value = [],
  onChange,
}: LocationDropdownMapProps) {
  const isLoaded = useGoogleMaps(GOOGLE_KEY);

  const [options, setOptions] = useState<Location[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>(value);
  const [searchValue, setSearchValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value changes
  useEffect(() => {
    setSelectedLocations(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isLoaded && mapRef.current && !map && selectedLocations.length > 0) {
      const m = new google.maps.Map(mapRef.current, {
        center: {
          lat: selectedLocations[0].lat,
          lng: selectedLocations[0].lng,
        },
        zoom: 5,
        mapTypeControl: false,
        zoomControl: true,
        fullscreenControl: true,
      });
      setMap(m);
    }
  }, [isLoaded, map, selectedLocations.length]);

  // Reset map when all locations are removed
  useEffect(() => {
    if (selectedLocations.length === 0 && map) {
      setMap(null);
    }
  }, [selectedLocations.length, map]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(mk => mk.setMap(null));
    markersRef.current = [];

    // Add new markers
    selectedLocations.forEach(location => {
      const mk = new google.maps.Marker({
        map,
        position: { lat: location.lat, lng: location.lng },
        title: location.description,
      });
      markersRef.current.push(mk);
    });

    // Update map view
    if (selectedLocations.length === 1) {
      map.setCenter({
        lat: selectedLocations[0].lat,
        lng: selectedLocations[0].lng,
      });
      map.setZoom(10);
    } else if (selectedLocations.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      selectedLocations.forEach(c => bounds.extend({ lat: c.lat, lng: c.lng }));
      map.fitBounds(bounds);
    }
  }, [map, selectedLocations.length]);

  const fetchPredictions = async (input: string): Promise<Location[]> => {
    if (!input || !window.google?.maps?.places) {
      return [];
    }

    const svc = new window.google.maps.places.AutocompleteService();
    const preds = await new Promise<
      google.maps.places.AutocompletePrediction[]
    >(resolve =>
      svc.getPlacePredictions(
        {
          input,
          types: ['geocode'],
        },
        r => {
          resolve(r || []);
        }
      )
    );

    const placesSvc = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );
    const results: Location[] = [];
    await Promise.all(
      preds.map(
        p =>
          new Promise<void>(res => {
            placesSvc.getDetails(
              {
                placeId: p.place_id,
                fields: ['geometry', 'formatted_address'],
              },
              pl => {
                if (pl?.geometry?.location) {
                  results.push({
                    description: p.description,
                    lat: pl.geometry.location.lat(),
                    lng: pl.geometry.location.lng(),
                  });
                }
                res();
              }
            );
          })
      )
    );
    return results;
  };

  const handleSearch = useCallback(async (value: string) => {
    setSearchValue(value);

    if (!value || value.length < 2) {
      setOptions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    try {
      const list = await fetchPredictions(value);
      setOptions(list);
      if (list.length > 0) {
        setShowDropdown(true);
      }
    } catch (error) {
      setOptions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectLocation = useCallback(
    (location: Location) => {
      // Check if location is already selected
      const isAlreadySelected = selectedLocations.some(
        c => c.description === location.description
      );
      if (isAlreadySelected) return;

      const newSelectedLocations = [...selectedLocations, location];
      setSelectedLocations(newSelectedLocations);
      setSearchValue('');
      setShowDropdown(false);
      setOptions([]);

      if (onChange) {
        onChange(newSelectedLocations);
      }
    },
    [selectedLocations, onChange]
  );

  const handleRemoveLocation = useCallback(
    (locationToRemove: Location) => {
      const newSelectedLocations = selectedLocations.filter(
        c => c.description !== locationToRemove.description
      );
      setSelectedLocations(newSelectedLocations);

      if (onChange) {
        onChange(newSelectedLocations);
      }
    },
    [selectedLocations, onChange]
  );

  const handleInputFocus = useCallback(() => {
    if (searchValue.length >= 2 && options.length > 0) {
      setShowDropdown(true);
    }
  }, [searchValue, options]);

  return (
    <div className='search-container'>
      {/* Search Bar */}
      <div ref={searchRef} className='relative'>
        <div className='relative'>
          <input
            ref={inputRef}
            type='text'
            value={searchValue}
            onChange={e => handleSearch(e.target.value)}
            onFocus={handleInputFocus}
            placeholder='Add location to target'
            className='search_input'
            style={{ fontSize: '16px' }}
          />
          <div className='absolute right-4 top-1/2 transform -translate-y-1/2'>
            {isSearching ? (
              <div className='w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin'></div>
            ) : (
              <svg
                className='w-5 h-5 text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                />
              </svg>
            )}
          </div>
        </div>

        {/* Dropdown Results */}
        {showDropdown && options.length > 0 && (
          <div className='search-dropdown absolute z-50 w-full mt-1 bg-white rounded-lg max-h-60 overflow-y-auto'>
            {options.map((location, index) => (
              <div
                key={index}
                onClick={() => handleSelectLocation(location)}
                className='search-dropdown-item px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0'
              >
                <div className='text-gray-800 font-medium'>
                  {location.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Locations Tags */}
      {selectedLocations.length > 0 && (
        <div className='mt-4 flex flex-wrap gap-2 justify-center'>
          {selectedLocations.map((location, index) => (
            <div key={index} className='location-tag'>
              <span>{location.description}</span>
              <button onClick={() => handleRemoveLocation(location)}>
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      {selectedLocations.length > 0 && (
        <div
          ref={mapRef}
          className='map-container w-full h-80 mt-6'
          style={{ minHeight: '300px' }}
        />
      )}
    </div>
  );
}
