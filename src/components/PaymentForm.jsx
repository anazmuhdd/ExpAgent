import React from 'react';
import { QrCode, ArrowRight } from 'lucide-react';

export default function PaymentForm({ 
  recipient, setRecipient, 
  amount, setAmount, 
  onStartScan 
}) {

  const handlePayment = (e) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    let pa = recipient;
    if (/^\d{10}$/.test(pa)) {
      pa = `${pa}@ybl`;
    }

    const upiLink = `super://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent('Payment')}&am=${encodeURIComponent(amount)}&cu=INR`;
    window.location.href = upiLink;
  };

  return (
    <form onSubmit={handlePayment} className="payment-form">
      <button 
        type="button" 
        className="scan-button"
        onClick={onStartScan}
      >
        <QrCode size={20} />
        Scan QR Code
      </button>
      
      <div className="divider">
        <span>OR</span>
      </div>

      <div className="input-group">
        <label htmlFor="recipient">UPI ID or Phone Number</label>
        <input 
          id="recipient"
          type="text" 
          placeholder="e.g. 9876543210 or user@upi" 
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          required
        />
        {/^\d{10}$/.test(recipient) && (
          <span className="hint-text">Will be formatted as {recipient}@ybl</span>
        )}
      </div>

      <div className="input-group">
        <label htmlFor="amount">Amount (₹)</label>
        <div className="amount-input-wrapper">
          <span className="currency-symbol">₹</span>
          <input 
            id="amount"
            type="number" 
            placeholder="0" 
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>

      <button type="submit" className="pay-button">
        Pay with Super.money
        <ArrowRight size={20} />
      </button>
    </form>
  );
}
