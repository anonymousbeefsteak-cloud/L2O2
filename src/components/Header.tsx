import React from 'react';

const Header: React.FC = () => {
    const handleOrderNowClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const orderSection = document.getElementById('order');
        if (orderSection) {
            window.scrollTo({ top: orderSection.offsetTop - 80, behavior: 'smooth' });
        }
    };

    return (
        <header className="pt-24 md:pt-32 bg-gradient-to-r from-[var(--primary)]/90 to-[var(--primary)] text-white">
            <div className="container mx-auto px-4 py-16 md:py-24">
                <div className="max-w-3xl">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 animate-fadeIn" style={{animationDelay: '0.2s'}}>美味不用等，線上訂餐更輕鬆</h2>
                    <p className="text-lg md:text-xl mb-8 opacity-90 animate-fadeIn" style={{animationDelay: '0.4s'}}>快速訂購您喜愛的台灣小吃，節省等待時間，到店即可取餐</p>
                    <a href="#order" onClick={handleOrderNowClick} className="inline-block bg-white text-[var(--primary)] border-2 border-[var(--primary)] py-3 px-6 rounded-full font-medium transition-all duration-300 hover:bg-transparent hover:text-white hover:border-white hover:shadow-lg active:scale-95 animate-fadeIn" style={{animationDelay: '0.6s'}}>
                        立即訂餐 <i className="fa fa-arrow-right ml-2"></i>
                    </a>
                </div>
            </div>
        </header>
    );
};

export default Header;
