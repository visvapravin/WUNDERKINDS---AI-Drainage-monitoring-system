import React from 'react';
import { X, Bell } from 'lucide-react';

interface NotificationPopupProps {
  notifications: string[];
  onClose: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ notifications, onClose }) => {
  // Determine climate effect from notifications
  type ClimateType = 'rain' | 'storm' | 'sunny' | 'cloudy' | 'flood' | '';
  let climateEffect: ClimateType = '';
  if (notifications.some(n => n.toLowerCase().includes('rain'))) {
    climateEffect = 'rain';
  } else if (notifications.some(n => n.toLowerCase().includes('storm'))) {
    climateEffect = 'storm';
  } else if (notifications.some(n => n.toLowerCase().includes('sunny'))) {
    climateEffect = 'sunny';
  } else if (notifications.some(n => n.toLowerCase().includes('cloud'))) {
    climateEffect = 'cloudy';
  } else if (notifications.some(n => n.toLowerCase().includes('flood'))) {
    climateEffect = 'flood';
  }

  const bgEffect: Record<ClimateType, string> = {
    rain: 'bg-gradient-to-br from-blue-900 via-blue-600 to-blue-400',
    storm: 'bg-gradient-to-br from-gray-800 via-gray-600 to-gray-400',
    sunny: 'bg-gradient-to-br from-yellow-200 via-yellow-400 to-orange-300',
    cloudy: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500',
    flood: 'bg-gradient-to-br from-blue-700 via-blue-400 to-blue-200',
    '': 'bg-black bg-opacity-50',
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 transition-all duration-500 ${bgEffect[climateEffect]}`}
      style={{ backgroundBlendMode: 'multiply', backgroundColor: climateEffect ? undefined : 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-lg w-full max-w-2xl relative">
        <div className="p-2 sm:p-4 flex flex-col sm:flex-row justify-between items-center border-b gap-2">
          <div className="flex items-center space-x-2">
            <Bell className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center text-gray-500 py-6 sm:py-8">
              <p>No notifications at this time</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`p-2 sm:p-4 rounded-lg ${
                    notification.toLowerCase().includes('flood')
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <p className={`${
                    notification.toLowerCase().includes('flood')
                      ? 'text-red-800'
                      : 'text-yellow-800'
                  } text-sm sm:text-base`}>
                    {notification}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;