import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './index.css';

function App() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let scanner = null;
    if (isScanning) {
      scanner = new Html5QrcodeScanner("qr-reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      }, false);

      scanner.render(
        (decodedText) => {
          try {
            // decodedText format: upi://pay?pa=merchant@upi&pn=Merchant&am=100&cu=INR
            // Handle both valid URL format and raw parameter formats if any
            let urlString = decodedText;
            if (!urlString.startsWith('upi://')) {
               // Sometimes raw pa values might be returned, though rare for UPI QR
               alert("Not a standard UPI QR code.");
               return;
            }

            // Using URL object to easily extract parameters
            const url = new URL(urlString);
            if (url.protocol === 'upi:') {
              const params = new URLSearchParams(url.search);
              const pa = params.get('pa');
              const am = params.get('am');
              
              if (pa) setRecipient(pa);
              if (am) setAmount(am);
              
              // Stop scanning on success
              setIsScanning(false);
              scanner.clear();
            } else {
              alert("Please scan a valid UPI QR code.");
            }
          } catch (e) {
            console.error(e);
            alert("Invalid QR code format.");
          }
        }, 
        (error) => {
          // Ignore general read errors (happens constantly while waiting for a good frame)
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [isScanning]);

  const handlePayment = (e) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    let pa = recipient;

    // Check if it's a 10 digit number without @
    const isPhoneNumber = /^\d{10}$/.test(pa);
    if (isPhoneNumber) {
      pa = `${pa}@ybl`;
    }

    const upiLink = `super://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent('Payment')}&am=${encodeURIComponent(amount)}&cu=INR`;
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
        
        {isScanning ? (
          <div className="scanner-container">
            <div id="qr-reader"></div>
            <button 
              type="button" 
              className="cancel-scan-button"
              onClick={() => setIsScanning(false)}
            >
              Cancel Scanning
            </button>
          </div>
        ) : (
          <form onSubmit={handlePayment} className="payment-form">
            <button 
              type="button" 
              className="scan-button"
              onClick={() => setIsScanning(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                <rect x="7" y="7" width="10" height="10"></rect>
              </svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;