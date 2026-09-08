import React, { useState } from 'react';
import { Scanner, useDevices } from '@yudiel/react-qr-scanner';
import { Camera, X } from 'lucide-react';

export default function ScannerOverlay({ onCancel, onScanSuccess }) {
  const devices = useDevices();
  const [deviceId, setDeviceId] = useState(undefined);

  const handleScan = (result) => {
    if (result && result.length > 0) {
      onScanSuccess(result[0].rawValue);
    }
  };

  const handleSwitchCamera = () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(d => d.deviceId === deviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setDeviceId(devices[nextIndex].deviceId);
    }
  };

  return (
    <div className="fullscreen-scanner-overlay">
      <div className="scanner-header-overlay">
         <h2>Scan to Pay</h2>
         <p>Point at any UPI QR code</p>
      </div>

      <div className="scanner-container">
        <Scanner
          onScan={handleScan}
          formats={['qr_code']}
          components={{ 
            audio: false, 
            finder: true,
          }}
          constraints={{ 
            deviceId: deviceId ? { exact: deviceId } : undefined,
            facingMode: deviceId ? undefined : 'environment'
          }}
          allowMultiple={true}
        />
      </div>

      <div className="scanner-controls">
        {devices && devices.length > 1 && (
          <button className="camera-switch-btn" onClick={handleSwitchCamera}>
            <Camera size={20} />
            Switch Lens
          </button>
        )}
        <button className="cancel-fullscreen-btn" onClick={onCancel}>
           <X size={20} />
           Cancel
        </button>
      </div>
    </div>
  );
}
