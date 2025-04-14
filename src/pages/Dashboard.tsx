import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Map as MapIcon, LogOut, Sun, Droplets, Wind, AlertTriangle, CloudRain, CloudDrizzle, CloudLightning } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NotificationPopup from '../components/NotificationPopup';
import { db } from '../firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { Device } from '../types/Device';
import Map from '../components/Map';
import '../styles/StickMan.css';

// Dummy device data
const dummyDevice: Device = {
  id: 'dummy',
  name: 'Dummy Device',
  lat: 10.8767,
  lng: 78.7091,
  altitude: 0,
  satellites: 4,
  speed: 0.5,
  waterLevel: 1.2,
  waterFlow: 0.8,
  waterSpeed: 1.0,
  status: 'Normal',
  timestamp: new Date().toISOString(),
  airQuality: 'Good',
  isRaining: false,
  prediction: 'No flooding expected'
};

// Dummy graph data
const dummyGraphData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  waterLevel: Math.sin(i * 0.5) + 1.5 // Generate sine wave pattern
}));

const getDeviceStatus = (device: Device) => {
  if (device.waterLevel >= 2.0 || device.waterFlow >= 2.0) {
    return { status: 'Danger', color: 'red' };
  } else if (device.waterLevel >= 1.0 || device.waterFlow >= 1.0) {
    return { status: 'Warning', color: 'yellow' };
  }
  return { status: 'Normal', color: 'green' };
};

interface RainStatus {
  status: 'Not Raining' | 'Slight Raining' | 'Raining' | 'Heavy Raining';
  intensity: number;
  lastUpdated: string;
}

function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchlight, setSearchlight] = useState(false);
  const [notifications, _setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device>(dummyDevice);
  const [devices, setDevices] = useState<Device[]>([]);
  const [waterLevelData, _setWaterLevelData] = useState(dummyGraphData);
  const [rainStatus, setRainStatus] = useState<RainStatus>({
    status: 'Not Raining',
    intensity: 0,
    lastUpdated: new Date().toISOString()
  });
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadRange, setDownloadRange] = useState('24h');

  useEffect(() => {
    const devicesRef = ref(db, 'devices');
    console.log('Setting up realtime listener for devices...');

    const unsubscribe = onValue(devicesRef, (snapshot) => {
      try {
        if (!snapshot.exists()) {
          console.log('No devices found');
          setDevices([]);
          return;
        }

        const devicesData = snapshot.val();
        const activeDevices: Device[] = [];

        Object.entries(devicesData).forEach(([deviceId, deviceData]: [string, any]) => {
          // Get the last entry for this device
          const entries = Object.entries(deviceData);
          const lastEntry = entries.reduce((latest: any, current: any) => {
            if (!latest || (current[1].timestamp && current[1].timestamp > latest[1].timestamp)) {
              return current;
            }
            return latest;
          }, null);

          if (lastEntry) {
            const latestData = lastEntry[1];
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
              activeDevices.push(device);
            }
          }
        });

        console.log(`Found ${activeDevices.length} active devices`);
        setDevices(activeDevices);
        
        // Update selected device if it exists in active devices
        if (activeDevices.length > 0) {
          const currentDevice = activeDevices.find(d => d.id === selectedDevice.id) || activeDevices[0];
          setSelectedDevice(currentDevice);
        }

      } catch (error) {
        console.error('Error processing devices data:', error);
      }
    });

    return () => unsubscribe();
  }, [selectedDevice.id]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleOpenMap = () => {
    console.log('Opening map...');
    setShowMap(true);
  };

  const downloadDeviceData = async (range: string) => {
    try {
      const deviceRef = ref(db, 'devices/esp32_ec780dbf1388');
      const snapshot = await get(deviceRef);
      
      if (!snapshot.exists()) {
        console.error('No data available');
        return;
      }

      const data = snapshot.val();
      const now = new Date();
      const cutoffTime = new Date();

      // Calculate cutoff time based on selected range
      switch (range) {
        case '24h':
          cutoffTime.setHours(now.getHours() - 24);
          break;
        case '7d':
          cutoffTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoffTime.setDate(now.getDate() - 30);
          break;
        case 'all':
          // No cutoff time for all data
          break;
      }

      const rows = [
        // CSV Header
        ['Timestamp', 'Water Level (m)', 'Water Flow (m³/s)', 'Water Speed (m/s)', 'Air Quality', 'Rain Status', 'GPS Latitude', 'GPS Longitude', 'Altitude (m)', 'Satellites', 'Speed (km/h)', 'Status', 'Prediction']
      ];

      // Convert data to rows with time filter
      Object.entries(data).forEach(([_, entry]: [string, any]) => {
        const entryTime = new Date(entry.timestamp);
        if (range === 'all' || entryTime >= cutoffTime) {
          rows.push([
            new Date(entry.timestamp).toLocaleString(),
            entry.waterLevel || '0',
            entry.waterFlow || '0',
            entry.waterSpeed || '0',
            entry.airQuality || 'N/A',
            entry.isRaining ? 'Raining' : 'Not Raining',
            entry.lat || '0',
            entry.lng || '0',
            entry.altitude || '0',
            entry.satellites || '0',
            entry.speed || '0',
            entry.status || 'Normal',
            entry.prediction || 'No prediction'
          ]);
        }
      });

      // Create CSV content
      const csvContent = rows.map(row => row.join(',')).join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const timeRange = range === 'all' ? 'complete' : range;
      link.setAttribute('href', url);
      link.setAttribute('download', `device_data_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowDownloadOptions(false);
    } catch (error) {
      console.error('Error downloading data:', error);
    }
  };

  // Function to get rain status icon
  const getRainIcon = (status: string) => {
    switch (status) {
      case 'Heavy Raining':
        return <CloudLightning className="text-blue-600 h-8 w-8" />;
      case 'Raining':
        return <CloudRain className="text-blue-500 h-8 w-8" />;
      case 'Slight Raining':
        return <CloudDrizzle className="text-blue-400 h-8 w-8" />;
      default:
        return <Droplets className="text-gray-400 h-8 w-8" />;
    }
  };

  // Function to fetch weather data and update rain status
  const updateRainStatus = async (device: Device) => {
    try {
      console.log('Fetching weather data for device:', {
        deviceId: device.id,
        location: `${device.lat},${device.lng}`
      });

      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=5c0111761a66467e97b80848251404&q=${device.lat},${device.lng}&aqi=no`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Weather API response:', data);
      
      const precipMm = data.current.precip_mm;
      console.log('Current precipitation:', precipMm, 'mm/h');
      
      let status: RainStatus['status'];
      if (precipMm === 0) {
        status = 'Not Raining';
      } else if (precipMm < 2.5) {
        status = 'Slight Raining';
      } else if (precipMm < 7.5) {
        status = 'Raining';
      } else {
        status = 'Heavy Raining';
      }

      const newRainStatus = {
        status,
        intensity: precipMm,
        lastUpdated: new Date().toISOString()
      };

      console.log('Updating rain status:', newRainStatus);
      setRainStatus(newRainStatus);

      // Update Firebase with the new rain status
      if (selectedDevice) {
        console.log('Updating Firebase with new rain status');
        const deviceRef = ref(db, `devices/${selectedDevice.id}`);
        await update(deviceRef, {
          rainStatus: newRainStatus,
          isRaining: status !== 'Not Raining'
        });
        console.log('Firebase update successful');
      }

    } catch (error) {
      console.error('Error updating rain status:', error);
    }
  };

  // Effect to update rain status periodically
  useEffect(() => {
    if (!selectedDevice) return;

    // Initial update
    updateRainStatus(selectedDevice);

    // Update every 15 minutes
    const interval = setInterval(() => {
      updateRainStatus(selectedDevice);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedDevice]);

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Map Component */}
      {showMap && (
        <div className="fixed inset-0 z-[9999] bg-white">
          <Map 
            onClose={() => {
              console.log('Closing map...');
              setShowMap(false);
            }} 
            onDeviceSelect={(device: Device) => {
              console.log('Device selected:', device);
              setSelectedDevice(device);
              setShowMap(false);
            }}
          />
        </div>
      )}

      {/* Notifications */}
      {showNotifications && (
        <div className="fixed inset-0 z-[9999]">
          <NotificationPopup
            notifications={notifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>
      )}
      
      <nav className="bg-white shadow-lg relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">DrainageAI Dashboard</h1>
              <span className="ml-4 text-gray-600">
                Active Devices: {devices.length}
              </span>
              <span className="ml-4 text-gray-600">
                Device: {selectedDevice ? selectedDevice.name : 'No Device'}
              </span>
              <span className={`ml-4 px-3 py-1 rounded-full text-sm font-medium
                ${getDeviceStatus(selectedDevice).status === 'Danger' ? 'bg-red-100 text-red-800' : 
                  getDeviceStatus(selectedDevice).status === 'Warning' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'}`}>
                {getDeviceStatus(selectedDevice).status}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowNotifications(true)}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600"
              >
                <Bell size={20} />
                <span>Notifications ({notifications.length})</span>
              </button>
              <button 
                onClick={handleOpenMap}
                className="flex items-center space-x-1 text-gray-600 hover:text-blue-600"
              >
                <MapIcon size={20} />
                <span>Map</span>
              </button>
              <button onClick={handleLogout} className="flex items-center space-x-1 text-gray-600 hover:text-blue-600">
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Air Quality</h2>
              <Sun className={selectedDevice.airQuality === 'Good' ? 'text-green-500' : 'text-red-500'} />
            </div>
            <p className={`text-2xl font-bold ${selectedDevice.airQuality === 'Good' ? 'text-green-500' : 'text-red-500'}`}>
              {selectedDevice.airQuality}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Searchlight Control</h2>
            <button
              onClick={() => setSearchlight(!searchlight)}
              className={`w-full py-2 px-4 rounded-md ${
                searchlight ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {searchlight ? 'Turn OFF' : 'Turn ON'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Water Flow Speed</h2>
              <Wind className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{selectedDevice.waterFlow.toFixed(2)} m/s</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Rain Status</h2>
                {getRainIcon(rainStatus.status)}
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-gray-900">{rainStatus.status}</p>
                {rainStatus.intensity > 0 && (
                  <p className="text-xs text-gray-600">
                    {rainStatus.intensity.toFixed(1)} mm/h
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Updated: {new Date(rainStatus.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Precaution</h2>
                <AlertTriangle className={`h-5 w-5 ${getDeviceStatus(selectedDevice).status === 'Danger' ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <button
                onClick={() => {
                  // Add precaution action here
                  console.log('Precaution button clicked');
                }}
                disabled={getDeviceStatus(selectedDevice).status !== 'Danger'}
                className={`w-full py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2
                  ${getDeviceStatus(selectedDevice).status === 'Danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>{getDeviceStatus(selectedDevice).status === 'Danger' ? 'Take Action' : 'No Action Required'}</span>
              </button>
              {getDeviceStatus(selectedDevice).status === 'Danger' && (
                <p className="mt-2 text-sm text-red-600">Warning: Critical water levels detected!</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4 h-[200px] flex items-center justify-center">
              <div className="stick-man-container w-full h-full">
                <div className="stick-man">
                  <div className="head"></div>
                  <div className="body"></div>
                  <div className="left-arm"></div>
                  <div className="right-arm"></div>
                  <div className="left-leg"></div>
                  <div className="right-leg"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold">Water Level</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium
                  ${getDeviceStatus(selectedDevice).status === 'Danger' ? 'bg-red-100 text-red-800' : 
                    getDeviceStatus(selectedDevice).status === 'Warning' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-green-100 text-green-800'}`}>
                  {getDeviceStatus(selectedDevice).status}
                </span>
              </div>
              <button
                onClick={() => setShowDownloadOptions(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Data
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-4xl font-bold">{selectedDevice.waterLevel.toFixed(2)}</span>
              <span className="text-gray-500">m</span>
            </div>
            
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterLevelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="waterLevel" 
                    stroke={
                      getDeviceStatus(selectedDevice).status === 'Danger' ? '#dc2626' : 
                      getDeviceStatus(selectedDevice).status === 'Warning' ? '#d97706' : 
                      '#059669'
                    }
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 col-span-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Prediction</h2>
              <AlertTriangle className="text-yellow-500" />
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800">{selectedDevice.prediction}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Options Dialog */}
      {showDownloadOptions && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <h3 className="text-lg font-semibold mb-4">Select Data Range</h3>
            <div className="space-y-3">
              {[
                { value: '24h', label: 'Last 24 Hours', icon: '🕐' },
                { value: '7d', label: 'Last 7 Days', icon: '📅' },
                { value: '30d', label: 'Last 30 Days', icon: '📊' },
                { value: 'all', label: 'All Data', icon: '💾' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => downloadDeviceData(option.value)}
                  className={`w-full p-3 flex items-center gap-3 rounded-lg border transition-all
                    ${downloadRange === option.value 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'}`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDownloadOptions(false)}
              className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;