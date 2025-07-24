import { useEffect, useState } from 'react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { X, Map as MapIcon, Search, Filter, Clock } from 'lucide-react';
import { Device } from '../types/Device';

const containerStyle = {
  width: '100%',
  height: '500px', // Increased height for better usability
  borderRadius: '0'
};

const defaultCenter = {
  lat: 10.87674933,
  lng: 78.7090145
};

const mapOptions = {
  mapTypeId: 'hybrid',
  zoom: 18,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: true,
  fullscreenControl: true,
  gestureHandling: 'greedy' as const, // Allow smooth and unrestricted mouse/touch panning
  clickableIcons: false,
};

interface MapProps {
  onClose: () => void;
  onDeviceSelect?: (device: Device) => void;
}

const libraries: ("places")[] = ["places"];

const Map: React.FC<MapProps> = ({ onClose, onDeviceSelect }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'AIzaSyCNrZkfeBmpCm8NnVd7IeJnctQhirPd5bA',
    libraries
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'warning' | 'danger'>('all');
  const [recentDevices, setRecentDevices] = useState<Device[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Add device to recent list
  const addToRecent = (device: Device) => {
    setRecentDevices(prev => {
      const filtered = prev.filter(d => d.id !== device.id);
      return [device, ...filtered].slice(0, 5); // Keep only last 5 devices
    });
  };

  // Filter devices based on search and status
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         device.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'normal' && device.status === 'Normal') ||
                         (statusFilter === 'warning' && device.status === 'Warning') ||
                         (statusFilter === 'danger' && device.status === 'Danger');
    
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (!isLoaded) return;

    const devicesRef = ref(db, 'devices');
    console.log('Setting up realtime listener for all devices...');

    const unsubscribe = onValue(devicesRef, (snapshot) => {
      try {
        if (!snapshot.exists()) {
          throw new Error('No devices found');
        }

        const devicesData = snapshot.val();
        console.log('Received realtime devices data:', devicesData);

        const processedDevices: Device[] = [];

        // Process each device
        Object.entries(devicesData).forEach(([deviceId, deviceData]: [string, any]) => {
          // Get the last entry for this device
          const entries = Object.entries(deviceData);
          const lastEntry = entries.reduce((latest: [string, any] | undefined, current: [string, any]) => {
            if (!latest || (current[1].timestamp && current[1].timestamp > latest[1].timestamp)) {
              return current;
            }
            return latest;
          }, undefined);

          if (lastEntry) {
            const latestData = (lastEntry as [string, any])[1] as Record<string, any>;
            const lat = parseFloat(latestData.lat);
            const lng = parseFloat(latestData.lng);

            if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
              const device: Device = {
                id: deviceId,
                name: `Device ${deviceId.split('_').pop()}`,
                lat,
                lng,
                altitude: parseFloat(latestData.altitude || '0'),
                satellites: parseInt(latestData.satellites || '0'),
                speed: parseFloat(latestData.speed || '0'),
                waterLevel: parseFloat(latestData.waterLevel || '0'),
                waterFlow: 0.80,
                waterSpeed: parseFloat(latestData.waterSpeed || '0'),
                status: latestData.status || 'Normal',
                timestamp: latestData.timestamp || new Date().toISOString(),
                airQuality: latestData.airQuality || 'Good',
                isRaining: Boolean(latestData.isRaining),
                prediction: latestData.prediction || 'No prediction available'
              };
              processedDevices.push(device);
            }
          }
        });

        if (processedDevices.length === 0) {
          throw new Error('No valid devices found');
        }

        console.log('Processed devices:', processedDevices);
        setDevices(processedDevices);
        setError(null);
        
      } catch (error) {
        console.error('Error processing realtime data:', error);
        setError(error instanceof Error ? error.message : 'Failed to process realtime data');
      }
    }, (error) => {
      console.error('Firebase realtime error:', error);
      setError(error.message);
    });

    return () => {
      console.log('Cleaning up realtime listener...');
      unsubscribe();
    };
  }, [isLoaded]);

  if (loadError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white">
        <div className="p-4 text-red-600 text-center">
          <p className="font-medium">Error loading maps</p>
          <p className="text-sm mt-2">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white">
        <div className="text-lg font-medium">Loading maps...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-lg w-[1200px] max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900">Device Location</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowRecent(e.target.value === '');
                }}
                onFocus={() => setShowRecent(searchQuery === '')}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {showRecent && recentDevices.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-2 border-b border-gray-100 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Recently viewed</span>
                  </div>
                  {recentDevices.map(device => (
            <button
                      key={device.id}
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowInfoWindow(true);
                        setShowRecent(false);
                        if (onDeviceSelect) {
                          onDeviceSelect(device);
                        }
                      }}
                      className="w-full p-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span className="text-sm">{device.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        device.status === 'Danger' ? 'bg-red-100 text-red-700' :
                        device.status === 'Warning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {device.status}
                      </span>
            </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "normal" | "warning" | "danger")}
                className="py-2 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="normal">Normal</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
              </select>
            </div>
          </div>
          {filteredDevices.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">No devices match your search criteria</p>
          ) : (
            <p className="text-sm text-gray-500 mt-2">
              Showing {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="overflow-auto">
          {error && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!isLoaded ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="text-gray-600">Loading map...</div>
            </div>
          ) : loadError ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="text-center text-red-600">
                <p className="font-medium">Error loading maps</p>
                <p className="text-sm mt-2">Failed to load Google Maps</p>
              </div>
            </div>
          ) : (
            <div>
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={filteredDevices[0]?.lat && filteredDevices[0]?.lng ? 
                  { lat: filteredDevices[0].lat, lng: filteredDevices[0].lng } : 
                  defaultCenter}
                options={mapOptions}
                onLoad={(map) => {
                  console.log('Map loaded successfully');
                  if (filteredDevices.length > 0) {
                    const bounds = new window.google.maps.LatLngBounds();
                    filteredDevices.forEach(device => {
                      bounds.extend({ lat: device.lat, lng: device.lng });
                    });
                    map.fitBounds(bounds);
                  }
                }}
              >
                {filteredDevices.map(device => (
                  <MarkerF
                    key={device.id}
                    position={{ lat: device.lat, lng: device.lng }}
                    onClick={() => {
                      setSelectedDevice(device);
                      setShowInfoWindow(true);
                      addToRecent(device);
                      if (onDeviceSelect) {
                        onDeviceSelect(device);
                      }
                    }}
                  >
                    {showInfoWindow && selectedDevice && selectedDevice.id === device.id && (
                      <InfoWindowF
                        position={{ lat: device.lat, lng: device.lng }}
                        onCloseClick={() => setShowInfoWindow(false)}
                      >
                  <div className="p-2">
                          <h3 className="font-medium mb-2">{device.name}</h3>
                          <div className="space-y-1 text-sm">
                            <p><strong>Latitude:</strong> {device.lat.toFixed(6)}</p>
                            <p><strong>Longitude:</strong> {device.lng.toFixed(6)}</p>
                            <p><strong>Altitude:</strong> {device.altitude.toFixed(2)}m</p>
                            <p><strong>Satellites:</strong> {device.satellites}</p>
                            <p><strong>Speed:</strong> {device.speed.toFixed(2)} km/h</p>
                            <p><strong>Water Level:</strong> {device.waterLevel.toFixed(2)}m</p>
                            <p><strong>Status:</strong> 
                              <span className={
                                device.status === 'Danger' ? 'text-red-600' :
                                device.status === 'Warning' ? 'text-yellow-600' :
                                'text-green-600'
                              }>
                                {' '}{device.status}
                              </span>
                            </p>
                            <p><strong>Last Updated:</strong> {new Date(device.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                      </InfoWindowF>
                    )}
                  </MarkerF>
            ))}
              </GoogleMap>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Map;