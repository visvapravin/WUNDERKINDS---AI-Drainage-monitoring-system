import { useState, useEffect } from 'react';
import { Device, defaultDevice } from '../types/Device';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { MapPin, Droplet, Wind, CloudRain, Activity, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  selectedDeviceId?: string;
  onOpenMap: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedDeviceId, onOpenMap }) => {
  const [device, setDevice] = useState<Device>(defaultDevice);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDeviceId) {
      setDevice(defaultDevice);
      return;
    }

    const deviceRef = ref(db, `devices/${selectedDeviceId}`);
    console.log(`Fetching device data for ID: ${selectedDeviceId}`);
    
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const deviceData: Device = {
            ...defaultDevice,
            ...data,
            id: selectedDeviceId,
            lat: Number(data.lat) || 0,
            lng: Number(data.lng) || 0,
            altitude: Number(data.altitude) || 0,
            satellites: Number(data.satellites) || 0,
            speed: Number(data.speed) || 0,
            waterLevel: Number(data.waterLevel) || 0,
            waterFlow: Number(data.waterFlow) || 0,
            waterSpeed: Number(data.waterSpeed) || 0,
            timestamp: data.timestamp || Date.now()
          };
          setDevice(deviceData);
          setError(null);
        } else {
          console.log('No data found for device:', selectedDeviceId);
          setDevice(defaultDevice);
          setError('Device not found');
        }
      } catch (err) {
        console.error('Error processing device data:', err);
        setDevice(defaultDevice);
        setError('Error loading device data');
      }
    });

    return () => unsubscribe();
  }, [selectedDeviceId]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'danger':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'normal':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {selectedDeviceId ? `Device ${selectedDeviceId}` : 'No Device Selected'}
        </h1>
        <button
          onClick={onOpenMap}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <MapPin size={20} />
          {selectedDeviceId ? 'Change Device' : 'Select Device'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Location Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-blue-600" />
            <h2 className="text-xl font-semibold">Location</h2>
          </div>
          <div className="space-y-2">
            <p><span className="font-medium">Latitude:</span> {device.lat.toFixed(6)}°</p>
            <p><span className="font-medium">Longitude:</span> {device.lng.toFixed(6)}°</p>
            <p><span className="font-medium">Altitude:</span> {device.altitude}m</p>
            <p><span className="font-medium">Satellites:</span> {device.satellites}</p>
            <p><span className="font-medium">Speed:</span> {device.speed} km/h</p>
          </div>
        </div>

        {/* Water Metrics Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Droplet className="text-blue-600" />
            <h2 className="text-xl font-semibold">Water Metrics</h2>
          </div>
          <div className="space-y-2">
            <p><span className="font-medium">Water Level:</span> {device.waterLevel}m</p>
            <p><span className="font-medium">Water Flow:</span> {device.waterFlow} m³/s</p>
            <p><span className="font-medium">Water Speed:</span> {device.waterSpeed} m/s</p>
            <p><span className="font-medium">Rain Status:</span> {device.isRaining ? 'Raining' : 'Not Raining'}</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-blue-600" />
            <h2 className="text-xl font-semibold">Status</h2>
          </div>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Current Status: </span>
              <span className={getStatusColor(device.status)}>{device.status}</span>
            </p>
            <p><span className="font-medium">Air Quality:</span> {device.airQuality}</p>
            <p><span className="font-medium">Last Update:</span> {formatTimestamp(Number(device.timestamp))}</p>
            {device.prediction && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-yellow-600" />
                  <span className="font-medium">Prediction:</span>
                </div>
                <p className="mt-1 text-sm">{device.prediction}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 