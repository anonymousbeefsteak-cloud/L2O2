
import React, { useState, useEffect, useCallback } from 'react';
import { CONFIG } from './constants';
import type { MenuItem, OrderData, NotificationState } from './types';
import Notification from './components/Notification';
import LoadingSpinner from './components/LoadingSpinner';

// Make TypeScript aware of the LIFF global object
declare const liff: {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: () => void;
  getProfile: () => Promise<{ userId: string; displayName: string }>;
};

const App: React.FC = () => {
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLineId, setCustomerLineId] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // App state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [liffUserId, setLiffUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  }, []);

  const setDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Set default to 30 mins from now
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setPickupTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  };

  const resetForm = useCallback(() => {
    setCustomerName('');
    setCustomerPhone('');
    // Keep LIFF ID if available from profile
    setCustomerLineId(liffUserId || ''); 
    setSelectedMenuItem('');
    setOrderNotes('');
    setDefaultDateTime();
  }, [liffUserId]);
  
  const initializeLiff = useCallback(async () => {
    try {
      await liff.init({ liffId: CONFIG.liffId });
      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        setLiffUserId(profile.userId);
        setCustomerName(profile.displayName || '');
        setCustomerLineId(profile.userId || '');
      } else {
        liff.login();
      }
    } catch (error) {
      console.error('LIFF initialization failed:', error);
      showNotification('無法初始化 LINE LIFF，部分功能可能無法使用', 'error');
    }
  }, [showNotification]);

  const loadMenu = useCallback(async () => {
    try {
      const response = await fetch(`${CONFIG.endpointUrl}?action=menu`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.menu)) {
        setMenuItems(data.menu);
      } else {
        throw new Error('Invalid menu data format');
      }
    } catch (error) {
      console.error('Failed to load menu:', error);
      showNotification('無法載入菜單，將使用預設菜單', 'error');
      setMenuItems(CONFIG.fallbackMenu);
    }
  }, [showNotification]);

  useEffect(() => {
    const initializeApp = async () => {
      await initializeLiff();
      await loadMenu();
      setDefaultDateTime();
    };
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || customerName.length < 2) {
      showNotification('姓名至少需要2個字符', 'error');
      return;
    }
    if (!/^09\d{8}$/.test(customerPhone.replace(/\D/g, ''))) {
      showNotification('請輸入正確的手機號碼格式 (例如: 0912345678)', 'error');
      return;
    }
    if (new Date(pickupTime) <= new Date()) {
      showNotification('取餐時間必須是未來時間', 'error');
      return;
    }
    if (!selectedMenuItem) {
      showNotification('請選擇一項餐點', 'error');
      return;
    }

    const priceMatch = selectedMenuItem.match(/\$(\d+)$/);
    const totalAmount = priceMatch ? parseInt(priceMatch[1], 10) : 0;

    const orderData: OrderData = {
      source: 'web_app_react_liff',
      liffUserId: liffUserId || '未提供',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerLineId: customerLineId.trim(),
      product: selectedMenuItem,
      totalAmount,
      pickupTime,
      notes: orderNotes.trim(),
      timestamp: new Date().toISOString(),
    };

    setIsLoading(true);

    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(CONFIG.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
          mode: 'cors',
        });
        
        if (!response.ok) {
           const errorText = await response.text();
           throw new Error(`HTTP 錯誤: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        if (result.status === 'success') {
          let notificationMessage = `✅ 訂單成功！\n訂單編號: ${result.orderId}\n取餐時間: ${new Date(pickupTime).toLocaleString('zh-TW')}\n總金額: $${totalAmount}`;
          if (customerLineId || liffUserId) {
            notificationMessage += `\n📱 Line通知已發送`;
          }
          showNotification(notificationMessage, 'success');
          resetForm();
          setIsLoading(false);
          return;
        } else {
          throw new Error(result.message || '後端回報訂單提交失敗');
        }
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        if (attempt === maxRetries) {
          showNotification(`❌ 訂單提交失敗，請檢查網絡或聯繫客服。錯誤: ${(error as Error).message}`, 'error');
        } else {
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-500 animate-fadeIn">
        <header className="bg-gradient-to-br from-red-500 to-orange-500 text-white p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-10"></div>
           <h1 className="text-4xl font-bold mb-2 relative z-10 text-shadow">🍜 台灣小吃店</h1>
           <p className="text-lg opacity-90 relative z-10">線上訂餐系統 • 快速方便</p>
        </header>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div>
              <label htmlFor="customerName" className="block mb-1.5 font-semibold text-gray-700 text-sm">顧客姓名 <span className="text-red-500">*</span></label>
              <input type="text" id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="請輸入您的姓名" required className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label htmlFor="customerPhone" className="block mb-1.5 font-semibold text-gray-700 text-sm">聯絡電話 <span className="text-red-500">*</span></label>
              <input type="tel" id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="請輸入您的手機號碼" required className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label htmlFor="customerLineId" className="block mb-1.5 font-semibold text-gray-700 text-sm">Line ID（選填）</label>
              <input type="text" id="customerLineId" value={customerLineId} onChange={(e) => setCustomerLineId(e.target.value)} placeholder="接收訂單通知用" className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            
            <div>
              <label htmlFor="pickupTime" className="block mb-1.5 font-semibold text-gray-700 text-sm">取餐時間 <span className="text-red-500">*</span></label>
              <input type="datetime-local" id="pickupTime" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} required className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
            </div>
            
            <div>
              <label htmlFor="menuSelect" className="block mb-1.5 font-semibold text-gray-700 text-sm">選擇餐點 <span className="text-red-500">*</span></label>
              <select id="menuSelect" value={selectedMenuItem} onChange={(e) => setSelectedMenuItem(e.target.value)} required className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white appearance-none">
                <option value="">請選擇餐點</option>
                {menuItems.map(item => (
                  <option key={item.id} value={`${item.name} $${item.price}`}>{`${item.emoji} ${item.name} - $${item.price}`}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="orderNotes" className="block mb-1.5 font-semibold text-gray-700 text-sm">訂單備註</label>
              <textarea id="orderNotes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={3} placeholder="如有特殊需求請在此備註..." className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition duration-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"></textarea>
            </div>
            
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <button type="submit" disabled={isLoading} className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold text-base cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">🚀 送出訂單</button>
            )}
        </form>
      </div>
      <Notification notification={notification} onClose={() => setNotification(null)} />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .text-shadow {
          text-shadow: 0 2px 5px rgba(0,0,0,0.25);
        }
        select {
          background-image: url('data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>');
          background-position: right 0.75rem center;
          background-repeat: no-repeat;
          background-size: 1.25em 1.25em;
        }
      `}</style>
    </div>
  );
};

export default App;
