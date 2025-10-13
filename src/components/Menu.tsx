import React from 'react';
import type { MenuItem as MenuItemType } from '../types';
import MenuItem from './MenuItem';

interface MenuProps {
    menuItems: MenuItemType[];
    onAddToOrder: (item: MenuItemType) => void;
}

const Menu: React.FC<MenuProps> = ({ menuItems, onAddToOrder }) => {
    return (
        <section id="menu" className="py-16 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">我們的菜單</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">精選道地台灣小吃，每一道都讓您回味無窮</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {menuItems.map(item => (
                        <MenuItem key={item.id} item={item} onAddToOrder={onAddToOrder} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Menu;
