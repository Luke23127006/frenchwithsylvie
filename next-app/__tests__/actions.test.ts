import { createAssignment, submitSolution, getAssignments, handleLogin, logout, getAllStudents, updateAssignees, getAssignmentDetailsForTeacher, gradeSubmission, getStudentSubmission } from '../lib/actions';
import { supabase } from '../lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../lib/auth';

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
  verifyToken: jest.fn(),
}));

describe('Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAssignment', () => {
    it('should successfully insert assignment and assignees, and call revalidatePath', async () => {
      const selectMock = jest.fn().mockResolvedValue({ data: [{ id: '1', title: 'Test Title' }], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      
      const assigneeInsertMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'assignments') return { insert: insertMock };
        if (table === 'assignment_assignees') return { insert: assigneeInsertMock };
        return { insert: jest.fn() };
      });

      const result = await createAssignment('Test Title', 'http://example.com/file.pdf', ['stu-1', 'stu-2']);

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(insertMock).toHaveBeenCalledWith([{ title: 'Test Title', file_url: 'http://example.com/file.pdf' }]);
      expect(supabase.from).toHaveBeenCalledWith('assignment_assignees');
      expect(assigneeInsertMock).toHaveBeenCalledWith([
        { assignment_id: '1', student_id: 'stu-1' },
        { assignment_id: '1', student_id: 'stu-2' }
      ]);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
      expect(result.data).toEqual([{ id: '1', title: 'Test Title' }]);
    });
  });

  describe('submitSolution', () => {
    it('should correctly insert submission data extracting student info from token', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'stu-1', full_name: 'Student One', role: 'student' });

      const selectMock = jest.fn().mockResolvedValue({ data: [{ id: 'sub-1' }], error: null });
      const insertMock = jest.fn().mockReturnValue({ select: selectMock });
      (supabase.from as jest.Mock).mockReturnValue({ insert: insertMock });

      const result = await submitSolution('assign-1', 'http://example.com/sol.pdf');

      expect(verifyToken).toHaveBeenCalledWith('valid.token');
      expect(supabase.from).toHaveBeenCalledWith('submissions');
      expect(insertMock).toHaveBeenCalledWith([{ 
        assignment_id: 'assign-1', 
        student_id: 'stu-1',
        student_name: 'Student One', 
        file_url: 'http://example.com/sol.pdf' 
      }]);
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/assignment/assign-1');
      expect(result.data).toEqual([{ id: 'sub-1' }]);
    });

    it('should fail if user is not authenticated', async () => {
      (cookies as jest.Mock).mockResolvedValue({ get: () => undefined });
      const result = await submitSolution('assign-1', 'http://example.com/sol.pdf');
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('getAssignments', () => {
    it('should filter by student id if role is student', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'stu-1', role: 'student' });

      const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const eqMock = jest.fn().mockReturnValue({ order: orderMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      await getAssignments();

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(selectMock).toHaveBeenCalledWith(expect.stringContaining('assignment_assignees!inner(student_id)'));
      expect(eqMock).toHaveBeenCalledWith('assignment_assignees.student_id', 'stu-1');
    });

    it('should return all assignments for teachers', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'teacher-1', role: 'teacher' });

      const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const selectMock = jest.fn().mockReturnValue({ order: orderMock });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      await getAssignments();

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(selectMock).toHaveBeenCalledWith(expect.not.stringContaining('assignment_assignees!inner'));
    });
  });

  describe('gradeSubmission', () => {
    it('should update grade and feedback when teacher is authenticated', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'teacher-1', role: 'teacher' });

      const singleMock = jest.fn().mockResolvedValue({ data: { assignment_id: 'a1', id: 's1', grade: 'A', feedback: '<p>Good</p>' }, error: null });
      const selectMock = jest.fn().mockReturnValue({ single: singleMock });
      const eqMock = jest.fn().mockReturnValue({ select: selectMock });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ update: updateMock });

      const result = await gradeSubmission('s1', 'A', '<p>Good</p>');

      expect(supabase.from).toHaveBeenCalledWith('submissions');
      expect(updateMock).toHaveBeenCalledWith({ grade: 'A', feedback: '<p>Good</p>' });
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/assignment/a1');
      expect(result.data.grade).toBe('A');
    });

    it('should fail if user is not a teacher', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'student-1', role: 'student' });

      const result = await gradeSubmission('s1', 'A', 'Good');
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('getStudentSubmission', () => {
    it('should fetch the submission for the authenticated student', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'student-1', role: 'student' });

      const maybeSingleMock = jest.fn().mockResolvedValue({ data: { id: 'sub-1' }, error: null });
      const eqMock2 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock1 });
      (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

      const result = await getStudentSubmission('a1');

      expect(supabase.from).toHaveBeenCalledWith('submissions');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock1).toHaveBeenCalledWith('assignment_id', 'a1');
      expect(eqMock2).toHaveBeenCalledWith('student_id', 'student-1');
      expect(result.data).toEqual({ id: 'sub-1' });
    });
  });
});
