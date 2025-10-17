
import React, { useEffect, useState } from 'react';
import type { NotificationState } from '../types';

interface NotificationProps {
  notification: NotificationState | null;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (notification) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        // Allow fade-out transition before calling onClose
        setTimeout(onClose, 500); 
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const baseClasses = "fixed top-5 right-5 p-4 rounded-lg text-white font-bold transition-transform duration-500 ease-in-out z-50 shadow-lg max-w-sm whitespace-pre-line";
  const typeClasses = notification.type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const visibilityClasses = show ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]';

  return (
    <div className={`${baseClasses} ${typeClasses} ${visibilityClasses}`}>
      {notification.message}
    </div>
  );
};

export default Notification;
