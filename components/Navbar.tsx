
import React, { useState, useEffect } from 'react';

const Navbar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.getBoundingClientRect().top + window.scrollY - 80,
                behavior: 'smooth'
            });
            setIsMenuOpen(false);
        }
    };

    const navClass = isScrolled
        ? 'py-2 bg-white/95 backdrop-blur-sm'
        : 'py-3 bg-white';

    return (
        <nav className={`fixed w-full z-20 transition-all duration-300 shadow-md ${navClass}`}>
            <div className="container mx-auto px-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <i className="fa fa-cutlery text-primary text-2xl"></i>
                    <h1 className="text-xl font-bold text-dark">台灣小吃店</h1>
                </div>
                <div className="hidden md:flex items-center space-x-6">
                    <a href="#menu" onClick={(e) => handleLinkClick(e, '#menu')} className="hover:text-primary transition-colors">菜單</a>
                    <a href="#order" onClick={(e) => handleLinkClick(e, '#order')} className="hover:text-primary transition-colors">線上訂餐</a>
                    <a href="#contact" onClick={(e) => handleLinkClick(e, '#contact')} className="hover:text-primary transition-colors">聯絡我們</a>
                </div>
                <button className="md:hidden text-xl text-dark" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <i className="fa fa-bars"></i>
                </button>
            </div>
            {isMenuOpen && (
                <div className="md:hidden bg-white w-full border-t">
                    <div className="container mx-auto px-4 py-2 flex flex-col space-y-3">
                        <a href="#menu" onClick={(e) => handleLinkClick(e, '#menu')} className="py-2 hover:text-primary transition-colors">菜單</a>
                        <a href="#order" onClick={(e) => handleLinkClick(e, '#order')} className="py-2 hover:text-primary transition-colors">線上訂餐</a>
                        <a href="#contact" onClick={(e) => handleLinkClick(e, '#contact')} className="py-2 hover:text-primary transition-colors">聯絡我們</a>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
