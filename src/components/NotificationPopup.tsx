import React from 'react';
import { X, Bell } from 'lucide-react';

interface NotificationPopupProps {
  notifications: string[];
  onClose: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ notifications, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl relative">
        <div className="p-4 flex justify-between items-center border-b">
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
            <div className="text-center text-gray-500 py-8">
              <p>No notifications at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    notification.toLowerCase().includes('flood')
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <p className={`${
                    notification.toLowerCase().includes('flood')
                      ? 'text-red-800'
                      : 'text-yellow-800'
                  }`}>
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