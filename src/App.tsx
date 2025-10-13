import React, { useState, useEffect, Fragment } from 'react';
import { MENU_ITEMS, APPS_SCRIPT_URL, LIFF_ID } from './constants';
import type { OrderItem, MenuItem, LiffProfile } from './types';
import Navbar from './components/Navbar';
import Header from './components/Header';
import Features from './components/Features';
import Menu from './components/Menu';
import OrderSection from './components/OrderSection';
import Contact from './components/Contact';
import Footer from './components/Footer';
import SuccessModal from './components/SuccessModal';

declare const window: any;

const App = () => {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submittedOrderId, setSubmittedOrderId] = useState('');
    const [notification, setNotification] = useState({ message: '', type: 'success', visible: false });
    const [liffProfile, setLiffProfile] = useState<LiffProfile | null>(null);
    const [isLiffReady, setIsLiffReady] = useState(false);

    const liff = window.liff;

    useEffect(() => {
        const initializeLiff = async () => {
            try {
                if (!liff) { 
                    console.error('LIFF SDK not found.'); 
                    return; 
                }
                await liff.init({ liffId: LIFF_ID });
                if (liff.isLoggedIn()) {
                    const profile = await liff.getProfile();
                    setLiffProfile(profile);
                }
            } catch (error) {
                console.error('LIFF initialization failed', error);
                showNotification('LIFF 初始化失敗', 'error');
            } finally {
                setIsLiffReady(true);
            }
        };
        initializeLiff();
    }, [liff]);
    
    useEffect(() => {
        if (notification.visible) {
            const timer = setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification.visible]);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type, visible: true });
    };

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleAddToOrder = (itemToAdd: MenuItem) => {
        setOrderItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === itemToAdd.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === itemToAdd.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...itemToAdd, quantity: 1 }];
        });
        showNotification(`${itemToAdd.emoji} ${itemToAdd.name} 已加入訂單`, 'success');
        // Scroll to the order section to show the user the updated order list
        document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
        if (newQuantity < 1) {
            handleRemoveItem(itemId);
        } else {
            setOrderItems(prevItems =>
                prevItems.map(item =>
                    item.id === itemId ? { ...item, quantity: newQuantity } : item
                )
            );
        }
    };
    
    const handleRemoveItem = (itemId: number) => {
        setOrderItems(prevItems => prevItems.filter(item => item.id !== itemId));
    };

    const handleFormSubmit = async (formData: { customerName: string; customerPhone: string; pickupTime: string; notes: string; }) => {
        const orderData = {
            ...formData,
            product: orderItems.map(i => `${i.name} x${i.quantity}`).join(', '),
            totalAmount: totalAmount,
            timestamp: new Date().toISOString(),
            source: 'web_app_react_liff_v2'
        };

        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(orderData),
                mode: 'cors',
            });

            if (!response.ok) throw new Error(`伺服器錯誤: ${response.status}`);
            
            const result = await response.json();

            if (result.status === 'success') {
                const pickupDate = new Date(formData.pickupTime).toLocaleString('zh-TW');
                if (liff && liff.isInClient()) {
                    const lineMessage = `🎉 您的訂單已成立！\n----------------------\n餐點：${orderData.product}\n姓名：${orderData.customerName}\n電話：${orderData.customerPhone}\n取餐時間：${pickupDate}\n訂單編號：${result.orderId}\n備註：${orderData.notes || '無'}\n----------------------\n感謝您的訂購！`;
                    await liff.sendMessages([{ type: 'text', text: lineMessage }]);
                    liff.closeWindow();
                } else {
                    setSubmittedOrderId(result.orderId);
                    setIsModalOpen(true);
                    setOrderItems([]);
                }
                return { success: true, message: '' };
            } else {
                throw new Error(result.message || '訂單發送失敗');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            showNotification(`❌ 發送失敗: ${errorMessage}`, 'error');
            return { success: false, message: errorMessage };
        }
    };

    if (!isLiffReady) {
        return (
            <div className="liff-loading-screen">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center animate-fadeIn">
                    <div className="inline-block w-10 h-10 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg text-gray-700">正在與 LINE 連接中...</p>
                </div>
            </div>
        );
    }

    return (
        <Fragment>
             <div 
                className={`fixed top-5 right-5 p-4 rounded-xl text-white font-bold shadow-lg transition-transform duration-500 z-50 whitespace-pre-line ${notification.visible ? 'translate-x-0' : 'translate-x-full'} ${notification.type === 'success' ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`}
                aria-live="assertive"
            >
                {notification.message}
            </div>

            <Navbar />
            <main>
                <Header />
                <Features />
                <Menu menuItems={MENU_ITEMS} onAddToOrder={handleAddToOrder} />
                <OrderSection 
                    orderItems={orderItems} 
                    totalAmount={totalAmount} 
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onFormSubmit={handleFormSubmit}
                    liffProfile={liffProfile}
                />
                <Contact />
            </main>
            <Footer />
            <SuccessModal 
                isOpen={isModalOpen}
                orderId={submittedOrderId}
                onClose={() => setIsModalOpen(false)}
            />
        </Fragment>
    );
};

export default App;
