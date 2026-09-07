import { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import './index.css';

function App() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState([]);
  
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  
  // Pinch-to-zoom state
  const zoomLevelRef = useRef(1);
  const initialPinchDistance = useRef(null);

  const addLog = (msg) => {
    setLogs(prev => {
      const newLogs = [...prev, `${new Date().toLocaleTimeString()} - ${msg}`];
      return newLogs.slice(-10);
    });
  };

  useEffect(() => {
    if (isScanning && videoRef.current) {
      addLog("Initializing Nimiq QrScanner...");
      
      QrScanner.hasCamera().then(hasCamera => {
        addLog(`Camera detected: ${hasCamera}`);
        if (hasCamera) {
          QrScanner.listCameras(true).then(cameras => {
            addLog(`Found ${cameras.length} cameras`);
          });
        }
      });

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          addLog(`SCANNED: ${result.data}`);
          handleScanSuccess(result.data);
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: false,
          highlightCodeOutline: false,
          maxScansPerSecond: 30,
          calculateScanRegion: (video) => {
             const size = Math.min(video.videoWidth, video.videoHeight);
             const scanAreaSize = Math.min(size, 400); 
             return {
                 x: (video.videoWidth - scanAreaSize) / 2,
                 y: (video.videoHeight - scanAreaSize) / 2,
                 width: scanAreaSize,
                 height: scanAreaSize,
             };
          }
        }
      );
      
      scannerRef.current = scanner;
      
      scanner.start().then(() => {
        addLog("Camera started successfully.");
        
        // Apply continuous auto-focus if supported on this iOS device
        if (videoRef.current && videoRef.current.srcObject) {
           const track = videoRef.current.srcObject.getVideoTracks()[0];
           if (track) {
               track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
                    .catch(e => addLog("Continuous focus not supported"));
           }
        }
      }).catch(err => {
        addLog(`ERROR starting camera: ${err}`);
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const handleScanSuccess = (decodedText) => {
    try {
      let urlString = decodedText;
      if (!urlString.startsWith('upi://')) {
          addLog("Result is not a standard UPI URL.");
          return;
      }

      const url = new URL(urlString);
      if (url.protocol === 'upi:') {
        const params = new URLSearchParams(url.search);
        const pa = params.get('pa');
        const am = params.get('am');
        
        if (pa) {
          setRecipient(pa);
          addLog(`Extracted UPI ID: ${pa}`);
        }
        
        if (am) {
          setAmount(am);
          addLog(`Extracted Amount: ${am}`);
          
          let redirectPa = pa;
          if (/^\d{10}$/.test(redirectPa)) {
            redirectPa = `${redirectPa}@ybl`;
          }

          const upiLink = `super://pay?pa=${encodeURIComponent(redirectPa)}&pn=${encodeURIComponent('Payment')}&am=${encodeURIComponent(am)}&cu=INR`;
          addLog(`Redirecting to super://pay...`);
          
          if (scannerRef.current) {
            scannerRef.current.stop();
          }
          setIsScanning(false);
          window.location.href = upiLink;
        } else {
          addLog(`No amount found. Closing scanner.`);
          if (scannerRef.current) {
            scannerRef.current.stop();
          }
          setIsScanning(false);
        }
      }
    } catch (e) {
      addLog(`Parse error: ${e.message}`);
    }
  };

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

  // Pinch-to-zoom logic
  const getPinchDistance = (e) => {
    if (e.touches.length !== 2) return null;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      initialPinchDistance.current = getPinchDistance(e);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialPinchDistance.current) {
      const currentDistance = getPinchDistance(e);
      const scale = currentDistance / initialPinchDistance.current;
      
      let newZoom = zoomLevelRef.current * scale;
      // Soft limits before checking hardware capabilities
      newZoom = Math.max(1, Math.min(newZoom, 10)); 
      
      applyZoom(newZoom);
      zoomLevelRef.current = newZoom;
      initialPinchDistance.current = currentDistance; 
    }
  };

  const applyZoom = (zoomValue) => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const track = videoRef.current.srcObject.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.zoom) {
          const min = capabilities.zoom.min || 1;
          const max = capabilities.zoom.max || 5;
          const clampedZoom = Math.max(min, Math.min(zoomValue, max));
          
          track.applyConstraints({ advanced: [{ zoom: clampedZoom }] })
               .catch(e => { /* silently fail if not supported */ });
        }
      } catch (e) {
        // Browser might not support getCapabilities
      }
    }
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
        <div 
          className="fullscreen-scanner-overlay"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Nimiq qr-scanner requires a raw video element with these attributes on iOS */}
          <video ref={videoRef} className="fullscreen-reader" playsInline autoPlay muted></video>
          
          <div className="scanner-ui">
            <div className="scanner-header">
              <h2>Scan to Pay</h2>
              <p>Point or Pinch-to-Zoom at any UPI QR code</p>
            </div>
            
            <div className="viewfinder">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
            </div>

            {/* Debug Console UI */}
            <div className="debug-console">
              <strong>Debug Logs:</strong>
              {logs.map((log, i) => (
                <div key={i} className="debug-log-item">{log}</div>
              ))}
            </div>

            <button 
              className="cancel-fullscreen-btn" 
              onClick={() => setIsScanning(false)}
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