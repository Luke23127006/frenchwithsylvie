import { middleware } from '../middleware';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '../lib/auth';

// Mock Next.js Server modules
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  return {
    ...originalModule,
    NextResponse: {
      redirect: jest.fn(),
      next: jest.fn(),
    },
  };
});

jest.mock('../lib/auth', () => ({
  verifyToken: jest.fn(),
}));

describe('Middleware Route Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (pathname: string, tokenValue?: string) => {
    const req = {
      nextUrl: {
        pathname,
      },
      url: `http://localhost:3000${pathname}`,
      cookies: {
        get: jest.fn().mockReturnValue(tokenValue ? { value: tokenValue } : undefined),
      },
    } as unknown as NextRequest;
    return req;
  };

  it('Case 1: Request to /dashboard with NO auth_token cookie -> Should call NextResponse.redirect to /login', async () => {
    const req = createMockRequest('/dashboard');
    
    await middleware(req);

    expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/login', 'http://localhost:3000/dashboard'));
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('Case 2: Request to /dashboard with an INVALID auth_token -> Should call NextResponse.redirect to /login', async () => {
    const req = createMockRequest('/dashboard', 'invalid.token');
    (verifyToken as jest.Mock).mockResolvedValue(null);

    const mockDelete = jest.fn();
    const mockResponse = { cookies: { delete: mockDelete } };
    (NextResponse.redirect as jest.Mock).mockReturnValue(mockResponse);

    await middleware(req);

    expect(verifyToken).toHaveBeenCalledWith('invalid.token');
    expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/login', 'http://localhost:3000/dashboard'));
    expect(mockDelete).toHaveBeenCalledWith('auth_token');
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('Case 3: Request to /dashboard with a VALID auth_token -> Should call NextResponse.next()', async () => {
    const req = createMockRequest('/dashboard', 'valid.token');
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1' });

    await middleware(req);

    expect(verifyToken).toHaveBeenCalledWith('valid.token');
    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('Case 4: Request to a public route like /assignment/123 -> Should bypass auth logic and call NextResponse.next()', async () => {
    const req = createMockRequest('/assignment/123');

    await middleware(req);

    // Should not check cookies or verify token for non-dashboard routes
    expect(req.cookies.get).not.toHaveBeenCalled();
    expect(verifyToken).not.toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
