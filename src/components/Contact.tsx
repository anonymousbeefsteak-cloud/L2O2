import React from 'react';

const FAQItem: React.FC<{ question: string; answer: string; }> = ({ question, answer }) => (
  <div>
      <h4 className="font-medium flex items-center">
          <i className="fa fa-question-circle text-[var(--primary)] mr-2"></i>{question}
      </h4>
      <p className="text-gray-600 text-sm mt-1">{answer}</p>
  </div>
);

const Contact: React.FC = () => {
  return (
    <section id="contact" className="py-16 bg-white">
        <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">聯絡我們</h2>
                    <p className="text-gray-600">如有任何問題或建議，歡迎隨時聯繫我們</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[var(--neutral)] p-6 rounded-xl shadow-sm">
                        <h3 className="text-xl font-semibold mb-4 text-dark">店舖資訊</h3>
                        <div className="space-y-4">
                            <div className="flex items-start"><i className="fa fa-map-marker text-[var(--primary)] mt-1 mr-3"></i><p className="text-dark">臺北市信義區松壽路123號</p></div>
                            <div className="flex items-start"><i className="fa fa-phone text-[var(--primary)] mt-1 mr-3"></i><p className="text-dark">02-1234-5678</p></div>
                            <div className="flex items-start"><i className="fa fa-clock-o text-[var(--primary)] mt-1 mr-3"></i><p className="text-dark">營業時間: 10:00 - 22:00</p></div>
                        </div>
                    </div>
                    <div className="bg-[var(--neutral)] p-6 rounded-xl shadow-sm">
                        <h3 className="text-xl font-semibold mb-4 text-dark">常見問題</h3>
                        <div className="space-y-4">
                            <FAQItem question="線上訂單需要提前多久訂購？" answer="建議提前至少15-30分鐘訂購，以便我們準備新鮮美味的餐點。" />
                            <FAQItem question="如何取消或修改訂單？" answer="請致電我們的店舖電話，提供您的訂單編號進行修改或取消。" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
};

export default Contact;
