import React, { useState } from 'react';
import Header from './components/Header';
import PaymentForm from './components/PaymentForm';
import ScannerOverlay from './components/ScannerOverlay';
import './index.css';

function App() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleScanSuccess = (decodedText) => {
    try {
      let urlString = decodedText;
      if (!urlString.startsWith('upi://')) {
          alert("Result is not a standard UPI URL.");
          return;
      }

      const url = new URL(urlString);
      if (url.protocol === 'upi:') {
        const params = new URLSearchParams(url.search);
        const pa = params.get('pa');
        const am = params.get('am');
        
        if (pa) {
          setRecipient(pa);
        }
        
        if (am) {
          setAmount(am);
          let redirectPa = pa;
          if (/^\d{10}$/.test(redirectPa)) {
            redirectPa = `${redirectPa}@ybl`;
          }

          const upiLink = `super://pay?pa=${encodeURIComponent(redirectPa)}&pn=${encodeURIComponent('Payment')}&am=${encodeURIComponent(am)}&cu=INR`;
          setIsScanning(false);
          window.location.href = upiLink;
        } else {
          setIsScanning(false);
        }
      }
    } catch (e) {
      console.error(`Parse error: ${e.message}`);
    }
  };

  return (
    <>
      <div className="container">
        <div className="glass-card">
          <Header />
          <PaymentForm 
            recipient={recipient} 
            setRecipient={setRecipient}
            amount={amount}
            setAmount={setAmount}
            onStartScan={() => setIsScanning(true)}
          />
        </div>
      </div>

      {isScanning && (
        <ScannerOverlay 
          onCancel={() => setIsScanning(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </>
  );
}

export default App;