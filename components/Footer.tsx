
import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-dark text-white py-8">
            <div className="container mx-auto px-4">
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <i className="fa fa-cutlery text-primary"></i>
                        <h2 className="text-xl font-bold">台灣小吃店</h2>
                    </div>
                    <p className="text-gray-400 mb-4">道地台灣味，滿足您的味蕾</p>
                    <p className="text-gray-500 text-sm">© 2024 台灣小吃店 版權所有</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
