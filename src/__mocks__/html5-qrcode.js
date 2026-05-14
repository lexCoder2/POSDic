// Mock for html5-qrcode — camera/QR scanning not needed in test environment
const Html5QrcodeScanner = jest.fn().mockImplementation(() => ({
  render: jest.fn(),
  clear: jest.fn().mockResolvedValue(undefined),
  getState: jest.fn().mockReturnValue(2),
}));

const Html5Qrcode = jest.fn().mockImplementation(() => ({
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

module.exports = { Html5QrcodeScanner, Html5Qrcode };
