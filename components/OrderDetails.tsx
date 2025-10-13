import React from 'react';
// FIX: Updated type import path to src/types.ts
import type { OrderItem } from '../src/types';

interface OrderDetailsProps {
    orderItems: OrderItem[];
    totalAmount: number;
    onRemoveFromOrder: (itemId: number) => void;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({ orderItems, totalAmount, onRemoveFromOrder }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-dark">
                <i className="fa fa-list-alt text-primary mr-2"></i> 訂單明細
            </h3>
            
            <div id="orderItems" className="space-y-4 mb-6 flex-grow">
                {orderItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 h-full flex flex-col justify-center items-center">
                        <i className="fa fa-shopping-basket text-4xl mb-2 opacity-30"></i>
                        <p>尚未選擇餐點</p>
                    </div>
                ) : (
                    orderItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-neutral rounded-lg shadow-sm">
                            <div>
                                <p className="font-medium text-dark">{item.emoji} {item.name}</p>
                                <p className="text-sm text-gray-500">${item.price} x {item.quantity}</p>
                            </div>
                            <div className="flex items-center">
                                <span className="font-semibold mr-3 text-dark">${item.price * item.quantity}</span>
                                <button 
                                    className="remove-from-order w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-red-100 hover:text-red-500 transition-colors"
                                    onClick={() => onRemoveFromOrder(item.id)}
                                >
                                    <i className="fa fa-minus text-xs"></i>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="border-t pt-4 mt-auto">
                <div className="flex justify-between font-semibold text-lg text-dark">
                    <span>總金額:</span>
                    <span id="totalAmount">${totalAmount}</span>
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;
