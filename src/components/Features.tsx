import React from 'react';

const FeatureCard: React.FC<{ icon: string; title: string; description: string; }> = ({ icon, title, description }) => (
    <div className="text-center p-6 rounded-lg shadow-sm bg-white">
        <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className={`fa ${icon} text-[var(--primary)] text-2xl`}></i>
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
    </div>
);

const Features: React.FC = () => {
  return (
    <section className="py-12 bg-[var(--neutral)]">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard icon="fa-clock-o" title="節省時間" description="線上提前訂餐，到店即可取餐，不用現場等候" />
                <FeatureCard icon="fa-shopping-cart" title="輕鬆訂購" description="簡單幾步，完成訂餐，支持多種餐點組合" />
                <FeatureCard icon="fa-check-circle" title="訂單確認" description="即時收到訂單確認，輕鬆掌握取餐時間" />
            </div>
        </div>
    </section>
  );
};

export default Features;
