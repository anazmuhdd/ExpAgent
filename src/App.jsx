import React, { useState } from 'react';
import Header from './components/Header';
import PaymentForm from './components/PaymentForm';
import ScannerOverlay from './components/ScannerOverlay';
import { parsePaymentPayload } from './utils/paymentParser';
import './index.css';

function App() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleScanSuccess = (decodedText) => {
    // Stage 2: Universal Payment Payload Parser (EMVCo + UPI)
    const result = parsePaymentPayload(decodedText);

    if (result.error) {
      setErrorMessage(result.error);
      alert(result.error);
      setIsScanning(false);
      return;
    }

    if (result.pa) {
      let pa = result.pa;
      if (/^\d{10}$/.test(pa)) {
        pa = `${pa}@ybl`;
      }
      setRecipient(pa);

      if (result.am) {
        setAmount(result.am);
        const upiLink = `super://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(result.pn || 'Payment')}&am=${encodeURIComponent(result.am)}&cu=${encodeURIComponent(result.cu || 'INR')}`;
        setIsScanning(false);
        window.location.href = upiLink;
      } else {
        setIsScanning(false);
      }
    } else {
      alert("No valid recipient VPA found in this payment code.");
      setIsScanning(false);
    }
  };

  return (
    <>
      <div className="container">
        <div className="glass-card">
          <Header />
          {errorMessage && (
            <div style={{
              background: 'rgba(255, 107, 107, 0.15)',
              border: '1px solid #FF6B6B',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#FF6B6B',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {errorMessage}
            </div>
          )}
          <PaymentForm 
            recipient={recipient} 
            setRecipient={setRecipient}
            amount={amount}
            setAmount={setAmount}
            onStartScan={() => {
              setErrorMessage('');
              setIsScanning(true);
            }}
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
