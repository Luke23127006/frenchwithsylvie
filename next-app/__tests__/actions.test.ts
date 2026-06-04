import { createAssignment, submitSolution, getAssignments, login } from '../lib/actions';
import { supabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

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

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
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
        { id: 2, title: 'Assignment 2', submissions: [] } // Test when count is missing
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

  describe('login', () => {
    it('should handle invalid username (user not found)', async () => {
      const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await login('baduser', 'password');

      expect(result.error).toBe('Invalid username or password');
      expect(bcrypt.compare).not.toHaveBeenCalled();
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

      const result = await login('user1', 'wrongpass');

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpass', 'hash');
      expect(result.error).toBe('Invalid username or password');
    });

    it('should handle valid credentials by setting a cookie', async () => {
      const singleMock = jest.fn().mockResolvedValue({ 
        data: { id: 'u1', username: 'user1', full_name: 'User One', password_hash: 'hash' }, 
        error: null 
      });
      const eqMock = jest.fn().mockReturnValue({ single: singleMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const setCookieMock = jest.fn();
      // In next/headers 15+, cookies() returns a Promise resolving to ReadonlyRequestCookies
      (cookies as jest.Mock).mockResolvedValue({ set: setCookieMock }); 

      const result = await login('user1', 'correctpass');

      expect(cookies).toHaveBeenCalled();
      expect(setCookieMock).toHaveBeenCalledWith(
        'auth_token', 
        'u1', 
        expect.objectContaining({ httpOnly: true })
      );
      expect(result.success).toBe(true);
      expect(result.user).toEqual({ id: 'u1', username: 'user1', full_name: 'User One' });
    });
  });
});
