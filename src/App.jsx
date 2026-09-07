import { useState } from 'react';
import './index.css';

function App() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handlePayment = (e) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    let pa = recipient;

    // Check if it's a 10 digit number without @
    const isPhoneNumber = /^\d{10}$/.test(pa);
    if (isPhoneNumber) {
      // Append a fallback UPI suffix if it's just a phone number
      pa = `${pa}@ybl`;
    }

    // Construct the super.money deep link
    // Scheme: super://
    const upiLink = `super://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent('Payment')}&am=${encodeURIComponent(amount)}&cu=INR`;

    // Redirect browser to the link
    window.location.href = upiLink;
  };

  return (
    <div className="container">
      <div className="glass-card">
        <div className="logo-container">
          <div className="logo-icon">S</div>
          <h1>Super.money</h1>
        </div>
        <p className="subtitle">Send money instantly via UPI</p>

        <form onSubmit={handlePayment} className="payment-form">
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
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;