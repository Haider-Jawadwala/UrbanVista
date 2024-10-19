// pages/payment.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function PaymentPage() {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const router = useRouter();

  const handlePayment = async (e) => {
    e.preventDefault();
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Show success alert
    alert('Payment successful!');
    
    // Navigate back to the previous page
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Head>
        <title>Payment Gateway</title>
        <meta name="description" content="Payment page for plot funding" />
      </Head>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 bg-blue-600 text-white rounded-t-lg">
          <h2 className="text-xl font-bold">Payment Gateway</h2>
        </div>
        <form onSubmit={handlePayment} className="p-6 space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              id="amount"
              type="text"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {['Card', 'UPI', 'NetBanking'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method.toLowerCase())}
                  className={`py-2 px-4 rounded-md ${
                    paymentMethod === method.toLowerCase()
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
          {paymentMethod === 'card' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="card-number" className="block text-sm font-medium text-gray-700">Card Number</label>
                <input
                  id="card-number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <input
                    id="expiry"
                    type="text"
                    placeholder="MM/YY"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium text-gray-700">CVV</label>
                  <input
                    id="cvv"
                    type="text"
                    placeholder="123"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                </div>
              </div>
            </div>
          )}
          {paymentMethod === 'upi' && (
            <div>
              <label htmlFor="upi-id" className="block text-sm font-medium text-gray-700">UPI ID</label>
              <input
                id="upi-id"
                type="text"
                placeholder="yourname@upi"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
          )}
          {paymentMethod === 'netbanking' && (
            <div>
              <label htmlFor="bank" className="block text-sm font-medium text-gray-700">Select Bank</label>
              <select
                id="bank"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
                <option value="">Select your bank</option>
                <option value="sbi">State Bank of India</option>
                <option value="hdfc">HDFC Bank</option>
                <option value="icici">ICICI Bank</option>
                <option value="axis">Axis Bank</option>
              </select>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Pay Now
          </button>
        </form>
      </div>
    </div>
  );
}