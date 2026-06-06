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

  it('Case 1: Request to protected route with NO auth_token cookie -> Should redirect to /login', async () => {
    const req = createMockRequest('/dashboard');
    
    await middleware(req);

    expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/login?redirect=%2Fdashboard', 'http://localhost:3000/dashboard'));
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('Case 2: Request to protected route with INVALID auth_token -> Should redirect to /login', async () => {
    const req = createMockRequest('/dashboard', 'invalid.token');
    (verifyToken as jest.Mock).mockResolvedValue(null);

    const mockDelete = jest.fn();
    const mockResponse = { cookies: { delete: mockDelete } };
    (NextResponse.redirect as jest.Mock).mockReturnValue(mockResponse);

    await middleware(req);

    expect(verifyToken).toHaveBeenCalledWith('invalid.token');
    expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/login?redirect=%2Fdashboard', 'http://localhost:3000/dashboard'));
    expect(mockDelete).toHaveBeenCalledWith('auth_token');
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('Case 3: Teacher requests /dashboard -> Should call NextResponse.next()', async () => {
    const req = createMockRequest('/dashboard', 'valid.token');
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'teacher' });

    await middleware(req);

    expect(verifyToken).toHaveBeenCalledWith('valid.token');
    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('Case 4: Student requests /student -> Should call NextResponse.next()', async () => {
    const req = createMockRequest('/student', 'valid.token');
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'student' });

    await middleware(req);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('Case 5: Student requests /dashboard -> Should redirect to /student', async () => {
    const req = createMockRequest('/dashboard', 'valid.token');
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'student' });

    await middleware(req);

    expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/student', 'http://localhost:3000/dashboard'));
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('Case 6: Teacher requests /student -> Should redirect to /dashboard', async () => {
    const req = createMockRequest('/student', 'valid.token');
    (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'teacher' });

    await middleware(req);

    expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/dashboard', 'http://localhost:3000/student'));
    expect(NextResponse.next).not.toHaveBeenCalled();
  });

  it('Case 7: Public route like /login -> Should bypass auth logic', async () => {
    const req = createMockRequest('/login');

    await middleware(req);

    expect(req.cookies.get).not.toHaveBeenCalled();
    expect(verifyToken).not.toHaveBeenCalled();
    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
