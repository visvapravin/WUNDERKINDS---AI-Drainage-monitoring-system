import { useState, useEffect } from 'react';
// Feedback component for prediction correctness
import { useRef } from 'react';
// Emoji faces for each score
const feedbackEmojis = [
  { emoji: '😡', label: 'Very Bad' },
  { emoji: '😠', label: 'Bad' },
  { emoji: '😕', label: 'Not Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😶', label: 'Average' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😊', label: 'Very Good' },
  { emoji: '😃', label: 'Great' },
  { emoji: '😁', label: 'Excellent' },
  { emoji: '🤩', label: 'Perfect' },
];

function PredictionFeedback({ onSubmit, value, disabled }: { onSubmit: (score: number) => void, value: number | null, disabled?: boolean }) {
  const [selected, setSelected] = useState<number | null>(value);
  const [hovered, setHovered] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col gap-2 mt-3" ref={containerRef}>
      <label className="text-sm text-gray-700 mb-1">How accurate was this prediction?</label>
      <div className="flex gap-1 flex-wrap items-center justify-start relative" style={{ minHeight: 56, overflow: 'visible' }}>
        {feedbackEmojis.map((item, idx) => {
          const num = idx + 1;
          const isSelected = selected === num;
          const isHovered = hovered === num;
          return (
            <div key={num} className="relative flex flex-col items-center justify-end">
              <button
                type="button"
                className={`w-10 h-10 rounded-full border flex flex-col items-center justify-center text-xl font-semibold transition-all duration-200 relative
                  ${isSelected ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-lg' :
                    isHovered ? 'bg-blue-100 text-blue-700 border-blue-300 scale-105' :
                    'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}
                  ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => { setSelected(num); onSubmit(num); }}
                onMouseEnter={() => setHovered(num)}
                onMouseLeave={() => setHovered(null)}
                disabled={disabled}
                aria-label={`Rate ${num}: ${item.label}`}
              >
                <span className="transition-transform duration-200" style={{ transform: isSelected ? 'scale(1.2)' : 'scale(1)' }}>{item.emoji}</span>
              </button>
              {/* Tooltip always inside box */}
              <span
                className="z-10 px-2 py-1 rounded bg-white border border-gray-200 shadow text-xs text-gray-600 whitespace-nowrap pointer-events-none select-none absolute left-1/2 -translate-x-1/2"
                style={{
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.2s',
                  bottom: -28,
                  minWidth: 60,
                  maxWidth: 100,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      {selected && (
        <span className="text-xs text-blue-700 mt-1 flex items-center gap-1 animate-fade-in">
          {feedbackEmojis[selected - 1].emoji} You rated: <span className="font-bold">{selected}/10</span> - {feedbackEmojis[selected - 1].label}
        </span>
      )}
    </div>
  );
}
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Map as MapIcon, LogOut, Sun, Droplets, AlertTriangle, CloudDrizzle, CloudLightning, CloudRain, Wind } from 'lucide-react';
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
  // Helper: send notification to Firebase
  const sendNotification = async (message: string) => {
    try {
      const notifRef = ref(db, `notifications/${selectedDevice.id}/${Date.now()}`);
      await update(notifRef, {
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };
  const [selectedDevice, setSelectedDevice] = useState<Device>(dummyDevice);
  // ...existing code...

  // Feedback state for prediction
  const [predictionFeedback, setPredictionFeedback] = useState<number | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackCooldown, setFeedbackCooldown] = useState(false);

  // Helper: get unique key for device+prediction
  const getFeedbackKey = () => {
    return `feedback_${selectedDevice?.id || ''}_${selectedDevice?.prediction || ''}`;
  };

  // Check cooldown on mount or device/prediction change
  useEffect(() => {
    const key = getFeedbackKey();
    const lastTime = localStorage.getItem(key);
    if (lastTime) {
      const diff = Date.now() - parseInt(lastTime, 10);
      if (diff < 4 * 60 * 1000) {
        setFeedbackCooldown(true);
        setFeedbackSubmitted(true);
        setTimeout(() => {
          setFeedbackCooldown(false);
          setFeedbackSubmitted(false);
        }, 4 * 60 * 1000 - diff);
      } else {
        setFeedbackCooldown(false);
        setFeedbackSubmitted(false);
      }
    } else {
      setFeedbackCooldown(false);
      setFeedbackSubmitted(false);
    }
    setPredictionFeedback(null);
  }, [selectedDevice?.id, selectedDevice?.prediction]);

  // Send feedback to Firebase for the selected device and prediction, only if not in cooldown
  const handlePredictionFeedback = async (score: number) => {
    if (feedbackCooldown) return;
    setPredictionFeedback(score);
    setFeedbackSubmitted(true);
    setFeedbackCooldown(true);
    try {
      if (selectedDevice && selectedDevice.id) {
        // Use timestamp to uniquely identify feedback for a prediction
        const feedbackRef = ref(db, `feedback/${selectedDevice.id}/${Date.now()}`);
        await update(feedbackRef, {
          prediction: selectedDevice.prediction,
          feedback: score,
          timestamp: new Date().toISOString(),
        });
        // Store last feedback time in localStorage
        const key = getFeedbackKey();
        localStorage.setItem(key, Date.now().toString());
        // Reset selection after sending
        setTimeout(() => {
          setFeedbackCooldown(false);
          setFeedbackSubmitted(false);
          setPredictionFeedback(null);
        }, 4 * 60 * 1000);
      }
    } catch (err) {
      // Optionally, handle error (show toast, etc.)
      console.error('Failed to send feedback to Firebase:', err);
      setFeedbackCooldown(false);
      setFeedbackSubmitted(false);
    }
  };
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);
  const [searchlight, setSearchlight] = useState(false);
  const [notifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [waterLevelData] = useState(dummyGraphData);
  const [rainStatus, setRainStatus] = useState<RainStatus>({
    status: 'Not Raining',
    intensity: 0,
    lastUpdated: new Date().toISOString()
  });
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadRange] = useState('24h');

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
                waterFlow: parseFloat(latestData.waterFlow || '0.8'),
                waterSpeed: parseFloat(latestData.waterSpeed || '0'),
                status: latestData.status || 'Normal',
                timestamp: latestData.timestamp || new Date().toISOString(),
                airQuality: latestData.airQuality || 'Good',
                isRaining: Boolean(latestData.isRaining),
                prediction: latestData.prediction || 'No prediction available'
              };
              activeDevices.push(device);

              // --- Anomaly detection and notification logic ---
              // 1. Water level anomaly
              if (device.waterLevel >= 2.0) {
                sendNotification('Anomaly: Water level is very high!');
              }
              // 2. Harmful gas (simulate: airQuality not Good)
              if (device.airQuality && device.airQuality !== 'Good') {
                sendNotification(`Anomaly: Harmful gas detected (${device.airQuality})!`);
              }
              // 3. Heavy rain
              if (latestData.rainStatus && latestData.rainStatus.status === 'Heavy Raining') {
                sendNotification('Anomaly: Heavy rain detected!');
              }
              // 4. Very low or very high water flow
              if (device.waterFlow < 0.2) {
                sendNotification('Anomaly: Water flow is very low!');
              }
              if (device.waterFlow > 2.0) {
                sendNotification('Anomaly: Water flow is very high!');
              }
              // 5. Speed anomaly (simulate: speed > 5 or < 0.1)
              if (device.speed > 5) {
                sendNotification('Anomaly: Device speed is abnormally high!');
              }
              if (device.speed < 0.1) {
                sendNotification('Anomaly: Device speed is abnormally low!');
              }
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
        sendNotification('Error: Problem occurred while processing device data!');
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
        `https://api.weatherapi.com/v1/current.json?key=${import.meta.env.VITE_WEATHER_API_KEY}&q=${device.lat},${device.lng}&aqi=no`
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
      {/* Map Modal & Overlay */}
      {showMap && (
        <>
          {/* Overlay with blur and opacity */}
          <div className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm transition-all duration-300" />
          {/* Map Modal - responsive */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-2 sm:px-6">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-0 overflow-hidden flex flex-col" style={{ minHeight: '60vh', maxHeight: '90vh' }}>
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
          </div>
        </>
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

      <div className={`max-w-7xl mx-auto px-4 py-6 transition-all duration-300 ${showMap ? 'blur-sm opacity-60 pointer-events-none' : ''}`}> 
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Prediction Box moved to top */}
          <div className="bg-white rounded-lg shadow p-6 col-span-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold">Prediction</h2>
              <AlertTriangle className="text-yellow-500" />
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-2">
              <p className="text-yellow-800">{selectedDevice.prediction}</p>
            </div>
            <PredictionFeedback
              onSubmit={handlePredictionFeedback}
              value={predictionFeedback}
              disabled={feedbackSubmitted || feedbackCooldown}
            />
            {feedbackSubmitted && (
              <div className="mt-2 text-green-600 text-sm">
                Thank you for your feedback!{feedbackCooldown && ' (You can submit again in 4 minutes)'}
              </div>
            )}
          </div>

          {/* Air Quality */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold">Air Quality</h2>
              <Sun className={selectedDevice.airQuality === 'Good' ? 'text-green-500' : 'text-red-500'} />
            </div>
            <p className={`text-2xl font-bold ${selectedDevice.airQuality === 'Good' ? 'text-green-500' : 'text-red-500'}`}>
              {selectedDevice.airQuality}
            </p>
          </div>

          {/* Searchlight Control */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base md:text-lg font-semibold mb-4">Searchlight Control</h2>
            <button
              onClick={() => setSearchlight(!searchlight)}
              className={`w-full py-2 px-4 rounded-md ${
                searchlight ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {searchlight ? 'Turn OFF' : 'Turn ON'}
            </button>
          </div>

          {/* Water Flow Speed */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold">Water Flow Speed</h2>
              <Wind className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{selectedDevice.waterFlow.toFixed(2)} m/s</p>
          </div>

          {/* Rain Status, Precaution, Stickman */}
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
              <div className="stick-man-container w-full h-full min-h-[120px] sm:min-h-[180px] md:min-h-[200px]">
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

          {/* Water Level Chart */}
          <div className="bg-white rounded-lg shadow p-6 col-span-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
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
              <div className="mt-8">
                <ResponsiveContainer width="100%" height="80%" minWidth={150} minHeight={250}>
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
          </div>
        </div>
      </div>

      {/* Download Options Dialog */}
      {showDownloadOptions && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[9999] px-2 sm:px-0">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xs sm:max-w-md p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Select Data Range</h3>
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
                  className={`w-full p-2 sm:p-3 flex items-center gap-2 sm:gap-3 rounded-lg border transition-all
                    ${downloadRange === option.value 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'}`}
                >
                  <span className="text-xl sm:text-2xl">{option.icon}</span>
                  <span className="font-medium text-sm sm:text-base">{option.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDownloadOptions(false)}
              className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base"
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