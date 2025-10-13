import React, { useState, useEffect } from 'react';
import { MENU_ITEMS, APPS_SCRIPT_URL } from './constants';

const liff: any = (window as any).liff;
const LIFF_ID = '2008276630-bYNjwMx7';

const getDefaultPickupTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface NotificationState {
    message: string;
    type: 'success' | 'error';
    visible: boolean;
}

const App: React.FC = () => {
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [pickupTime, setPickupTime] = useState(getDefaultPickupTime());
    const [menuSelect, setMenuSelect] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<NotificationState>({ message: '', type: 'success', visible: false });
    const [isLiffReady, setIsLiffReady] = useState(false);

    useEffect(() => {
        const initializeLiff = async () => {
            try {
                if (!liff) {
                    console.error('LIFF SDK not found.');
                    setIsLiffReady(true);
                    return;
                }
                await liff.init({ liffId: LIFF_ID });
                if (liff.isLoggedIn()) {
                    const profile = await liff.getProfile();
                    setCustomerName(profile.displayName);
                }
            } catch (error) {
                console.error('LIFF initialization failed', error);
                showNotification('LIFF 初始化失敗', 'error');
            } finally {
                setIsLiffReady(true);
            }
        };
        initializeLiff();
    }, []);

    useEffect(() => {
        if (notification.visible) {
            const timer = setTimeout(() => {
                setNotification(prev => ({ ...prev, visible: false }));
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification.visible]);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type, visible: true });
    };

    const resetForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setMenuSelect('');
        setOrderNotes('');
        setPickupTime(getDefaultPickupTime());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName || !customerPhone || !menuSelect) {
            showNotification('請填寫所有必填欄位', 'error');
            return;
        }
        
        setIsLoading(true);

        const priceMatch = menuSelect.match(/\$(\d+)$/);
        const totalAmount = priceMatch ? parseInt(priceMatch[1], 10) : 0;
        
        const orderData = {
            customerName,
            customerPhone,
            product: menuSelect,
            totalAmount,
            pickupTime,
            notes: orderNotes,
            timestamp: new Date().toISOString(),
            source: 'web_app_react_liff'
        };

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                 headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(orderData),
                mode: 'cors',
            });
            
            if (!response.ok) {
                throw new Error(`伺服器錯誤: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.status === 'success') {
                const pickupDate = new Date(pickupTime).toLocaleString('zh-TW');

                if (liff && liff.isInClient()) {
                    const lineMessage = `🎉 您的訂單已成立！
----------------------
餐點：${menuSelect}
姓名：${customerName}
電話：${customerPhone}
取餐時間：${pickupDate}
訂單編號：${result.orderId}
備註：${orderNotes || '無'}
----------------------
感謝您的訂購！`;
                    await liff.sendMessages([{ type: 'text', text: lineMessage }]);
                    liff.closeWindow();
                } else {
                    let successMessage = `✅ 訂單成功！\n訂單編號: ${result.orderId}\n取餐時間: ${new Date(pickupTime).toLocaleString('zh-TW')}`;
                    showNotification(successMessage, 'success');
                    resetForm();
                }

            } else {
                throw new Error(result.message || '訂單發送失敗');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            showNotification(`❌ 發送失敗: ${errorMessage}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isLiffReady) {
        return (
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center animate-fadeIn">
                 <div className="inline-block w-10 h-10 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                 <p className="mt-4 text-lg text-gray-700">正在與 LINE 連接中...</p>
            </div>
        );
    }

    return (
        <>
            <div 
                className={`fixed top-5 right-5 p-4 rounded-xl text-white font-bold shadow-lg transition-transform duration-500 z-50 whitespace-pre-line ${notification.visible ? 'translate-x-0' : 'translate-x-full'} ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ backgroundColor: notification.type === 'success' ? 'var(--success)' : 'var(--danger)'}}
                aria-live="assertive"
            >
                {notification.message}
            </div>

            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                <header className="bg-gradient-to-r from-[var(--secondary)] to-[var(--secondary-dark)] text-white p-8 text-center">
                    <h1 className="text-3xl font-bold mb-2">🍜 台灣小吃店</h1>
                    <p className="opacity-90">線上訂餐系統 • 快速方便</p>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="form-group">
                        <label className="block mb-2 font-semibold text-gray-700" htmlFor="customerName">顧客姓名 <span className="text-red-500">*</span></label>
                        <input type="text" id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="請輸入您的姓名" required className="w-full p-3 border-2 border-gray-200 rounded-xl transition focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"/>
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 font-semibold text-gray-700" htmlFor="customerPhone">聯絡電話 <span className="text-red-500">*</span></label>
                        <input type="tel" id="customerPhone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="請輸入您的手機號碼" required className="w-full p-3 border-2 border-gray-200 rounded-xl transition focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"/>
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 font-semibold text-gray-700" htmlFor="pickupTime">取餐時間 <span className="text-red-500">*</span></label>
                        <input type="datetime-local" id="pickupTime" value={pickupTime} onChange={e => setPickupTime(e.target.value)} required className="w-full p-3 border-2 border-gray-200 rounded-xl transition focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"/>
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 font-semibold text-gray-700" htmlFor="menuSelect">選擇餐點 <span className="text-red-500">*</span></label>
                        <select id="menuSelect" value={menuSelect} onChange={e => setMenuSelect(e.target.value)} required className="w-full p-3 border-2 border-gray-200 rounded-xl transition appearance-none bg-white bg-no-repeat bg-right-4" style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundSize: '1.5em 1.5em'}}>
                            <option value="">請選擇餐點</option>
                            {MENU_ITEMS.map(item => (
                                <option key={item.id} value={`${item.emoji} ${item.name} - $${item.price}`}>{item.emoji} {item.name} - ${item.price}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="block mb-2 font-semibold text-gray-700" htmlFor="orderNotes">訂單備註</label>
                        <textarea id="orderNotes" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={3} placeholder="如有特殊需求請在此備註" className="w-full p-3 border-2 border-gray-200 rounded-xl transition focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"></textarea>
                    </div>

                    {isLoading && (
                        <div className="text-center p-4">
                            <div className="inline-block w-10 h-10 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                            <p className="mt-2 text-sm text-gray-600">訂單發送中...</p>
                        </div>
                    )}
                    
                    <button type="submit" disabled={isLoading} className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:bg-gray-400 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed" style={{backgroundColor: isLoading ? undefined : 'var(--success)'}}>
                        🚀 送出訂單
                    </button>
                </form>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out;
                }
            `}</style>
        </>
    );
};

export default App;