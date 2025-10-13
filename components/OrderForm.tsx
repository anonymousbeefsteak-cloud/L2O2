
import React, { useState, useEffect } from 'react';

interface OrderFormProps {
    onFormSubmit: (formData: any) => Promise<{success: boolean, message: string}>;
    hasItems: boolean;
}

const getDefaultPickupTime = () => {
    const defaultPickupTime = new Date();
    defaultPickupTime.setMinutes(defaultPickupTime.getMinutes() + 30);
    return defaultPickupTime.toISOString().slice(0, 16);
};

const OrderForm: React.FC<OrderFormProps> = ({ onFormSubmit, hasItems }) => {
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        pickupTime: getDefaultPickupTime(),
        notes: ''
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        // Reset form error when items are added
        if (hasItems) {
            setFormError('');
        }
    }, [hasItems]);

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.customerName.trim()) newErrors.customerName = '請輸入您的姓名';
        if (!/^09\d{8}$/.test(formData.customerPhone)) newErrors.customerPhone = '請輸入有效的手機號碼 (09開頭的10位數字)';
        if (!formData.pickupTime) newErrors.pickupTime = '請選擇取餐時間';
        
        setErrors(newErrors);
        
        if (!hasItems) {
            setFormError('請至少選擇一項餐點');
            return false;
        }

        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!validate()) {
            return;
        }
        setIsLoading(true);
        const result = await onFormSubmit(formData);
        setIsLoading(false);
        if (result.success) {
            setFormData({
                customerName: '',
                customerPhone: '',
                pickupTime: getDefaultPickupTime(),
                notes: ''
            });
            setErrors({});
        } else {
            setFormError(result.message);
        }
    };
    
    return (
        <form id="orderForm" className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="customerName">姓名 <span className="text-red-500">*</span></label>
                <input type="text" id="customerName" name="customerName" value={formData.customerName} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"/>
                {errors.customerName && <div className="text-red-500 text-sm mt-1">{errors.customerName}</div>}
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="customerPhone">手機號碼 <span className="text-red-500">*</span></label>
                <input type="tel" id="customerPhone" name="customerPhone" value={formData.customerPhone} onChange={handleChange} required
                    pattern="09\d{8}" placeholder="0912345678"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"/>
                <p className="text-xs text-gray-500 mt-1">請輸入10位數手機號碼</p>
                {errors.customerPhone && <div className="text-red-500 text-sm mt-1">{errors.customerPhone}</div>}
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="pickupTime">取餐時間 <span className="text-red-500">*</span></label>
                <input type="datetime-local" id="pickupTime" name="pickupTime" value={formData.pickupTime} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"/>
                {errors.pickupTime && <div className="text-red-500 text-sm mt-1">{errors.pickupTime}</div>}
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="notes">備註 (選填)</label>
                <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"></textarea>
            </div>
            
            <button type="submit" className="w-full bg-primary text-white py-3 px-6 rounded-full font-medium transition-all duration-300 hover:bg-primary/90 hover:shadow-lg active:scale-95 flex items-center justify-center disabled:opacity-50" disabled={isLoading}>
                {isLoading ? (
                    <i className="fa fa-circle-o-notch fa-spin text-xl"></i>
                ) : (
                    <><i className="fa fa-check mr-2"></i> 確認訂餐</>
                )}
            </button>
            
            {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    <i className="fa fa-exclamation-circle mr-1"></i>
                    <span>{formError}</span>
                </div>
            )}
        </form>
    );
};

export default OrderForm;
