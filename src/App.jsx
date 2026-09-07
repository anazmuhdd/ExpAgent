import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import './index.css';

function App() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (isScanning) {
      // Initialize the core Html5Qrcode class
      const html5QrCode = new Html5Qrcode("full-screen-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = { 
        fps: 30, 
        qrbox: { width: 260, height: 260 },
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      // Force rear camera
      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success callback
          try {
            let urlString = decodedText;
            if (!urlString.startsWith('upi://')) {
               alert("Not a standard UPI QR code.");
               return;
            }

            const url = new URL(urlString);
            if (url.protocol === 'upi:') {
              const params = new URLSearchParams(url.search);
              const pa = params.get('pa');
              const am = params.get('am');
              
              if (pa) setRecipient(pa);
              
              if (am) {
                // If amount is present, set it and instantly redirect!
                setAmount(am);
                
                let redirectPa = pa;
                if (/^\d{10}$/.test(redirectPa)) {
                  redirectPa = `${redirectPa}@ybl`;
                }

                const upiLink = `super://pay?pa=${encodeURIComponent(redirectPa)}&pn=${encodeURIComponent('Payment')}&am=${encodeURIComponent(am)}&cu=INR`;
                
                // Stop scanning and redirect
                html5QrCode.stop().then(() => {
                  setIsScanning(false);
                  window.location.href = upiLink;
                });
              } else {
                // No amount found, just prefill and let user enter amount
                html5QrCode.stop().then(() => {
                  setIsScanning(false);
                });
              }
            } else {
              alert("Please scan a valid UPI QR code.");
            }
          } catch (e) {
            console.error(e);
            alert("Invalid QR code format.");
          }
        },
        (error) => {
          // Ignore read errors, wait for a good frame
        }
      ).catch((err) => {
        console.error("Error starting camera", err);
        alert("Could not start camera. Please ensure permissions are granted and you are on a secure connection (HTTPS).");
        setIsScanning(false);
      });
    }

    return () => {
      // Cleanup on unmount or when scanning is toggled off
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(e => console.error("Failed to stop scanner", e));
      }
    };
  }, [isScanning]);

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
    <>
      <div className="container">
        <div className="glass-card">
          <div className="logo-container">
            <div className="logo-icon">S</div>
            <h1>Super.money</h1>
          </div>
          <p className="subtitle">Send money instantly via UPI</p>
          
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
        </div>
      </div>

      {isScanning && (
        <div className="fullscreen-scanner-overlay">
          <div id="full-screen-reader" className="fullscreen-reader"></div>
          
          <div className="scanner-ui">
            <div className="scanner-header">
              <h2>Scan to Pay</h2>
              <p>Point your camera at any UPI QR code</p>
            </div>
            
            <div className="viewfinder">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
            </div>

            <button 
              className="cancel-fullscreen-btn" 
              onClick={() => {
                if (html5QrCodeRef.current) {
                  html5QrCodeRef.current.stop().then(() => {
                    setIsScanning(false);
                  });
                } else {
                  setIsScanning(false);
                }
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;