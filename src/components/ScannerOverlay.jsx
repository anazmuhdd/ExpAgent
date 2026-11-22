import React, { useState, useEffect, useMemo } from 'react';
import { Scanner, useDevices } from '@yudiel/react-qr-scanner';
import { Camera, X } from 'lucide-react';

export default function ScannerOverlay({ onCancel, onScanSuccess }) {
  const devices = useDevices();
  const [deviceId, setDeviceId] = useState(undefined);

  // Filter only back / environment cameras if labels are available
  const backCameras = useMemo(() => {
    if (!devices || devices.length === 0) return [];
    const filtered = devices.filter(d => {
      const label = (d.label || '').toLowerCase();
      // Exclude front / selfie cameras
      return !label.includes('front') && !label.includes('user');
    });
    return filtered.length > 0 ? filtered : devices;
  }, [devices]);

  // Automatically select the main back camera once devices are loaded
  useEffect(() => {
    if (!deviceId && backCameras.length > 0) {
      // Look for the primary "Back Camera" (avoiding "Ultra Wide" or "Telephoto" if possible)
      const primary = backCameras.find(d => {
        const lbl = (d.label || '').toLowerCase();
        return (lbl.includes('back camera') || lbl.includes('wide')) && !lbl.includes('ultra wide');
      }) || backCameras[0];

      if (primary?.deviceId) {
        setDeviceId(primary.deviceId);
      }
    }
  }, [backCameras, deviceId]);

  const handleScan = (result) => {
    if (result && result.length > 0) {
      onScanSuccess(result[0].rawValue);
    }
  };

  const handleSwitchCamera = () => {
    const list = backCameras.length > 1 ? backCameras : devices;
    if (list && list.length > 1) {
      const currentIndex = list.findIndex(d => d.deviceId === deviceId);
      const nextIndex = (currentIndex + 1) % list.length;
      setDeviceId(list[nextIndex].deviceId);
    }
  };

  return (
    <div className="fullscreen-scanner-overlay">
      <div className="scanner-header-overlay">
        <h2>Scan to Pay</h2>
        <p>Point at any UPI or BharatQR code</p>
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
            facingMode: deviceId ? undefined : { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }}
          scanDelay={100}
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
