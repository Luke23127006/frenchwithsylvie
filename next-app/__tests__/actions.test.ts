import { createAssignment, submitSolution, getAssignments, handleLogin, logout } from '../lib/actions';
import { supabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { signToken } from '../lib/auth';

// Mock dependencies
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

jest.mock('../lib/auth', () => ({
  signToken: jest.fn(),
}));

describe('Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAssignment', () => {
    it('should successfully insert data and call revalidatePath', async () => {
      // Mock supabase chain: from().insert().select()
      const selectMock = jest.fn().mockResolvedValue({ data: [{ id: '1', title: 'Test Title' }], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

      const result = await createAssignment('Test Title', 'http://example.com/file.pdf');

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(insertMock).toHaveBeenCalledWith([{ title: 'Test Title', file_url: 'http://example.com/file.pdf' }]);
      expect(selectMock).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
      expect(result.data).toEqual([{ id: '1', title: 'Test Title' }]);
      expect(result.error).toBeUndefined();
    });
    
    it('should handle errors gracefully', async () => {
      const selectMock = jest.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

      const result = await createAssignment('Test Title', 'http://example.com/file.pdf');
      
      expect(result.error).toBe('Insert failed');
      expect(result.data).toBeUndefined();
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('submitSolution', () => {
    it('should correctly insert submission data and call revalidatePath', async () => {
      const selectMock = jest.fn().mockResolvedValue({ data: [{ id: 'sub-1' }], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

      const result = await submitSolution('assign-1', 'Student One', 'http://example.com/sol.pdf');

      expect(supabase.from).toHaveBeenCalledWith('submissions');
      expect(insertMock).toHaveBeenCalledWith([{ 
        assignment_id: 'assign-1', 
        student_name: 'Student One', 
        file_url: 'http://example.com/sol.pdf' 
      }]);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/assignment/assign-1');
      expect(result.data).toEqual([{ id: 'sub-1' }]);
    });
  });

  describe('getAssignments', () => {
    it('should return an array of mocked assignment data with formatted submission counts', async () => {
      const mockData = [
        { id: 1, title: 'Assignment 1', submissions: [{ count: 5 }] },
        { id: 2, title: 'Assignment 2', submissions: [] } 
      ];
      
      const orderMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await getAssignments();

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('submissions (count)'));
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      
      expect(result.data).toEqual([
        { id: 1, title: 'Assignment 1', submissions: [{ count: 5 }], submissions_count: 5 },
        { id: 2, title: 'Assignment 2', submissions: [], submissions_count: 0 }
      ]);
    });
  });

  describe('handleLogin', () => {
    it('should handle invalid username (user not found)', async () => {
      const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const formData = new FormData();
      formData.append('username', 'baduser');
      formData.append('password', 'password');

      const result = await handleLogin(formData);

      expect(result?.error).toBe('Invalid username or password');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(cookies).not.toHaveBeenCalled();
    });

    it('should handle invalid password', async () => {
      const singleMock = jest.fn().mockResolvedValue({ 
        data: { id: 'u1', username: 'user1', password_hash: 'hash' }, 
        error: null 
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const formData = new FormData();
      formData.append('username', 'user1');
      formData.append('password', 'wrongpass');

      const result = await handleLogin(formData);

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpass', 'hash');
      expect(result?.error).toBe('Invalid username or password');
      expect(cookies).not.toHaveBeenCalled();
    });

    it('should handle valid teacher credentials by setting a cookie and redirecting to /dashboard', async () => {
      const singleMock = jest.fn().mockResolvedValue({ 
        data: { id: 'u1', username: 'user1', full_name: 'User One', password_hash: 'hash', role: 'teacher' }, 
        error: null 
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (signToken as jest.Mock).mockResolvedValue('mock.jwt.token');

      const setCookieMock = jest.fn();
      (cookies as jest.Mock).mockResolvedValue({ set: setCookieMock }); 

      const formData = new FormData();
      formData.append('username', 'user1');
      formData.append('password', 'correctpass');

      await handleLogin(formData);

      expect(signToken).toHaveBeenCalledWith({ id: 'u1', username: 'user1', full_name: 'User One', role: 'teacher' });
      expect(cookies).toHaveBeenCalled();
      expect(setCookieMock).toHaveBeenCalledWith(
        'auth_token', 
        'mock.jwt.token', 
        expect.objectContaining({ httpOnly: true, maxAge: 86400 })
      );
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle valid student credentials by setting a cookie and redirecting to /student', async () => {
      const singleMock = jest.fn().mockResolvedValue({ 
        data: { id: 'u2', username: 'user2', full_name: 'User Two', password_hash: 'hash', role: 'student' }, 
        error: null 
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (signToken as jest.Mock).mockResolvedValue('mock.jwt.token');

      const setCookieMock = jest.fn();
      (cookies as jest.Mock).mockResolvedValue({ set: setCookieMock }); 

      const formData = new FormData();
      formData.append('username', 'user2');
      formData.append('password', 'correctpass');

      await handleLogin(formData);

      expect(signToken).toHaveBeenCalledWith({ id: 'u2', username: 'user2', full_name: 'User Two', role: 'student' });
      expect(redirect).toHaveBeenCalledWith('/student');
    });
  });

  describe('logout', () => {
    it('should delete the auth_token cookie and redirect to /login', async () => {
      const deleteCookieMock = jest.fn();
      (cookies as jest.Mock).mockResolvedValue({ delete: deleteCookieMock });

      await logout();

      expect(cookies).toHaveBeenCalled();
      expect(deleteCookieMock).toHaveBeenCalledWith('auth_token');
      expect(redirect).toHaveBeenCalledWith('/login');
    });
  });
});
