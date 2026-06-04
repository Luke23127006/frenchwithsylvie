import { signToken, verifyToken } from '../lib/auth';
import { SignJWT, jwtVerify } from 'jose';

jest.mock('jose', () => ({
  SignJWT: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe('JWT Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('signToken', () => {
    it('should generate a valid JWT string', async () => {
      const mockSign = jest.fn().mockResolvedValue('mock.jwt.token');
      const mockSetExpirationTime = jest.fn().mockReturnValue({ sign: mockSign });
      const mockSetIssuedAt = jest.fn().mockReturnValue({ setExpirationTime: mockSetExpirationTime });
      const mockSetProtectedHeader = jest.fn().mockReturnValue({ setIssuedAt: mockSetIssuedAt });

      (SignJWT as jest.Mock).mockImplementation(() => ({
        setProtectedHeader: mockSetProtectedHeader,
      }));

      const payload = { id: 'user-1', username: 'testuser' };
      const token = await signToken(payload);

      expect(SignJWT).toHaveBeenCalledWith(payload);
      expect(mockSetProtectedHeader).toHaveBeenCalledWith({ alg: 'HS256' });
      expect(mockSetIssuedAt).toHaveBeenCalled();
      expect(mockSetExpirationTime).toHaveBeenCalledWith('1d');
      expect(mockSign).toHaveBeenCalled();
      expect(token).toBe('mock.jwt.token');
    });

    it('should throw an error if JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET;
      const payload = { id: 'user-1' };
      
      await expect(signToken(payload)).rejects.toThrow('JWT_SECRET environment variable is not set.');
    });
  });

  describe('verifyToken', () => {
    it('should return the correct payload for a valid token', async () => {
      const mockPayload = { id: 'user-1', username: 'testuser' };
      (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockPayload });

      const payload = await verifyToken('valid.jwt.token');

      expect(jwtVerify).toHaveBeenCalledWith('valid.jwt.token', expect.any(Uint8Array));
      expect(payload).toEqual(mockPayload);
    });

    it('should return null for an invalid, malformed, or expired token', async () => {
      (jwtVerify as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      const payload = await verifyToken('invalid.jwt.token');

      expect(jwtVerify).toHaveBeenCalledWith('invalid.jwt.token', expect.any(Uint8Array));
      expect(payload).toBeNull();
    });
  });
});
