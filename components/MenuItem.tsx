import React from 'react';
// FIX: Updated type import path to src/types.ts
import type { MenuItem as MenuItemType } from '../src/types';

interface MenuItemProps {
    item: MenuItemType;
    onAddToOrder: (item: MenuItemType) => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onAddToOrder }) => {
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold flex items-center text-dark">
                        {item.emoji} {item.name}
                    </h3>
                    <span className="text-lg font-bold text-primary">${item.price}</span>
                </div>
                <button 
                    className="w-full py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                    onClick={() => onAddToOrder(item)}
                >
                    <i className="fa fa-plus mr-1"></i> 加入訂單
                </button>
            </div>
        </div>
    );
};

export default MenuItem;
