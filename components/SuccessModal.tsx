
import React, { useEffect, useRef } from 'react';

interface SuccessModalProps {
    isOpen: boolean;
    orderId: string;
    onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, orderId, onClose }) => {
    const modalContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                modalContentRef.current?.classList.remove('scale-95', 'opacity-0');
                modalContentRef.current?.classList.add('scale-100', 'opacity-100');
            }, 10);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        if (modalContentRef.current) {
            modalContentRef.current.classList.remove('scale-100', 'opacity-100');
            modalContentRef.current.classList.add('scale-95', 'opacity-0');
        }
        setTimeout(onClose, 300); // Wait for animation to finish
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
                ref={modalContentRef}
                className="bg-white rounded-xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-95 opacity-0"
            >
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa fa-check text-2xl text-green-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-dark">訂單提交成功！</h3>
                    <p className="text-gray-600 mb-4">您的訂單已順利提交，我們會盡快準備您的餐點</p>
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <p className="text-sm text-gray-500 mb-1">訂單編號</p>
                        <p className="font-semibold text-lg text-dark">{orderId}</p>
                    </div>
                    <button onClick={handleClose} className="w-full bg-primary text-white py-3 px-6 rounded-full font-medium transition-all duration-300 hover:bg-primary/90 hover:shadow-lg active:scale-95">
                        完成
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;
