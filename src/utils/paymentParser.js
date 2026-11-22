/**
 * CRC-16/CCITT-FALSE calculation for EMVCo QR code payloads.
 * Polynomial: 0x1021, Initial: 0xFFFF
 */
export function computeCRC16CCITTFalse(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Parses EMVCo Tag-Length-Value (TLV) payload string.
 * Used by BharatQR, SGQR, PromptPay, QRIS, etc.
 */
export function parseEMVCoTLV(raw) {
  const tags = {};
  let idx = 0;

  while (idx + 4 <= raw.length) {
    const tag = raw.substring(idx, idx + 2);
    const lenStr = raw.substring(idx + 2, idx + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len)) break;

    const valueStart = idx + 4;
    const valueEnd = valueStart + len;
    if (valueEnd > raw.length) break;

    const value = raw.substring(valueStart, valueEnd);
    tags[tag] = value;
    idx = valueEnd;
  }

  return tags;
}

/**
 * Validates and extracts payment parameters from an EMVCo QR (BharatQR / MPM).
 */
export function parseEMVCoPayment(raw) {
  if (!raw.startsWith('000201')) {
    return null;
  }

  // Check CRC16 (Tag 63 length 04)
  const tag63Idx = raw.lastIndexOf('6304');
  if (tag63Idx !== -1 && tag63Idx + 8 <= raw.length) {
    const dataToVerify = raw.substring(0, tag63Idx + 4);
    const providedCRC = raw.substring(tag63Idx + 4, tag63Idx + 8).toUpperCase();
    const computedCRC = computeCRC16CCITTFalse(dataToVerify);
    if (providedCRC !== computedCRC) {
      console.warn(`[EMVCo] CRC Checksum mismatch: expected ${computedCRC}, got ${providedCRC}`);
      return {
        type: 'INVALID_CHECKSUM',
        error: 'Tampered or corrupted EMVCo QR payload (CRC mismatch)'
      };
    }
  }

  const tags = parseEMVCoTLV(raw);

  const amount = tags['54'] || '';
  const merchantName = tags['59'] || 'Merchant';
  const currency = tags['53'] === '356' ? 'INR' : (tags['53'] || 'INR');

  let upiVpa = null;

  for (let tagNum = 26; tagNum <= 51; tagNum++) {
    const tagStr = String(tagNum).padStart(2, '0');
    if (tags[tagStr]) {
      const subTags = parseEMVCoTLV(tags[tagStr]);
      if (subTags['01'] && subTags['01'].includes('@')) {
        upiVpa = subTags['01'];
        break;
      }
      const match = tags[tagStr].match(/([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/);
      if (match) {
        upiVpa = match[1];
        break;
      }
    }
  }

  return {
    type: 'EMVCO',
    pa: upiVpa,
    pn: merchantName,
    am: amount,
    cu: currency,
    isStatic: tags['01'] === '11',
    tags
  };
}

/**
 * Universal payment string parser.
 * Handles:
 * 1. Standard UPI URI: `upi://pay?pa=...`
 * 2. EMVCo Merchant-Presented Mode (BharatQR): `000201...`
 * 3. Raw VPA: `example@upi`
 * 4. Security warning for rogue HTTP(S) links
 */
export function parsePaymentPayload(raw) {
  if (!raw || typeof raw !== 'string') {
    return { type: 'UNKNOWN', error: 'Empty or invalid QR code data' };
  }

  const trimmed = raw.trim();

  // 1. Quishing / Phishing Guard: Prevent arbitrary Web links
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      type: 'BLOCKED_URL',
      url: trimmed,
      error: 'Security Warning: This QR code points to an external website, not a payment address.'
    };
  }

  // 2. Standard UPI URI
  if (trimmed.startsWith('upi://')) {
    try {
      const url = new URL(trimmed);
      const params = new URLSearchParams(url.search);
      const pa = params.get('pa') || '';
      const pn = params.get('pn') || 'Payment';
      const am = params.get('am') || '';
      const cu = params.get('cu') || 'INR';
      const mc = params.get('mc') || '';
      const tr = params.get('tr') || '';

      if (!pa) {
        return { type: 'INVALID_UPI', error: 'UPI link does not contain a recipient VPA (pa parameter).' };
      }

      return {
        type: 'UPI_URI',
        pa,
        pn,
        am,
        cu,
        mc,
        tr,
        raw: trimmed
      };
    } catch (e) {
      return { type: 'INVALID_UPI', error: `Malformed UPI URI: ${e.message}` };
    }
  }

  // 3. EMVCo MPM (BharatQR)
  if (trimmed.startsWith('000201')) {
    const emv = parseEMVCoPayment(trimmed);
    if (emv) {
      if (emv.type === 'INVALID_CHECKSUM') {
        return emv;
      }
      return {
        ...emv,
        raw: trimmed
      };
    }
  }

  // 4. Raw VPA or phone number
  if (/^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/.test(trimmed)) {
    return {
      type: 'RAW_VPA',
      pa: trimmed,
      pn: 'Payment',
      am: '',
      cu: 'INR',
      raw: trimmed
    };
  }

  return {
    type: 'UNSUPPORTED',
    error: 'Unrecognized QR code format. Please scan a valid UPI or BharatQR code.'
  };
}
