// Mock for @bwip-js/browser — not needed in test environment
module.exports = {
  toCanvas: jest.fn().mockResolvedValue(undefined),
  toSVG: jest.fn().mockReturnValue(""),
  toBuffer: jest.fn().mockResolvedValue(Buffer.alloc(0)),
};
module.exports.default = module.exports;
