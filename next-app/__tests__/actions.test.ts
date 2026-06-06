import { createAssignment, submitSolution, getAssignments, handleLogin, logout, getAllStudents, updateAssignees, getAssignmentDetailsForTeacher, gradeSubmission, getStudentSubmission, updateAssignmentTitle, removeSubmission, changePassword, uploadFile } from '../lib/actions';
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
  hash: jest.fn(),
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

      const chainMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(chainMock);

      await getAssignments();

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(chainMock.select).toHaveBeenCalledWith(expect.stringContaining('assignment_assignees!inner(student_id)'));
      expect(chainMock.eq).toHaveBeenCalledWith('assignment_assignees.student_id', 'stu-1');
    });

    it('should return all assignments for teachers', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'teacher-1', role: 'teacher' });

      const chainMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      (supabase.from as jest.Mock).mockReturnValue(chainMock);

      await getAssignments();

      expect(supabase.from).toHaveBeenCalledWith('assignments');
      expect(chainMock.select).toHaveBeenCalledWith(expect.not.stringContaining('assignment_assignees!inner'));
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

  describe('removeSubmission', () => {
    it('should delete submission and revalidate when student is authenticated', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'student-1', role: 'student' });

      const eqMock2 = jest.fn().mockResolvedValue({ error: null });
      const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock1 });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      const result = await removeSubmission('sub-1', 'a1');

      expect(supabase.from).toHaveBeenCalledWith('submissions');
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock1).toHaveBeenCalledWith('id', 'sub-1');
      expect(eqMock2).toHaveBeenCalledWith('student_id', 'student-1');
      expect(revalidatePath).toHaveBeenCalledWith('/assignment/a1');
      expect(result.success).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should update password hash if old password is correct', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1' });

      // Mock fetching user
      const singleMockUser = jest.fn().mockResolvedValue({ data: { id: 'user-1', password_hash: 'old_hash' }, error: null });
      const eqMockUser = jest.fn().mockReturnValue({ single: singleMockUser });
      const selectMockUser = jest.fn().mockReturnValue({ eq: eqMockUser });
      const fromMockUser = jest.fn().mockReturnValue({ select: selectMockUser });
      
      // Mock updating user
      const eqMockUpdate = jest.fn().mockResolvedValue({ error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMockUpdate });
      const fromMockUpdate = jest.fn().mockReturnValue({ update: updateMock });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'users') {
          // We need a way to differentiate select vs update in this simple mock
          return { select: selectMockUser, update: updateMock };
        }
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');

      const formData = new FormData();
      formData.append('oldPassword', 'old_pass');
      formData.append('newPassword', 'new_pass');
      
      // We modified changePassword to take 2 strings directly, not formData. Let's fix the test call.
      const result = await changePassword('old_pass', 'new_pass');

      expect(bcrypt.compare).toHaveBeenCalledWith('old_pass', 'old_hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('new_pass', 10);
      expect(updateMock).toHaveBeenCalledWith({ password_hash: 'new_hash' });
      expect(result.success).toBe(true);
    });
  });

  describe('uploadFile', () => {
    it('should handle large file uploads (> 1MB) without action error', async () => {
      const mockCookieGet = jest.fn().mockReturnValue({ value: 'valid.token' });
      (cookies as jest.Mock).mockResolvedValue({ get: mockCookieGet });
      (verifyToken as jest.Mock).mockResolvedValue({ id: 'user-1' });

      // Mock supabase storage upload
      const getPublicUrlMock = jest.fn().mockReturnValue({ data: { publicUrl: 'http://large-file-url.pdf' } });
      const uploadMock = jest.fn().mockResolvedValue({ data: { path: 'path' }, error: null });
      
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      });

      // Create a dummy large file (e.g. 2MB)
      const largeBuffer = new ArrayBuffer(2 * 1024 * 1024);
      const largeFile = new File([largeBuffer], 'large.pdf', { type: 'application/pdf' });
      
      const formData = new FormData();
      formData.append('file', largeFile);

      const result = await uploadFile(formData, 'assignments');

      expect(supabase.storage.from).toHaveBeenCalledWith('assignments');
      expect(uploadMock).toHaveBeenCalled();
      expect(result.url).toBe('http://large-file-url.pdf');
      expect(result.error).toBeUndefined();
    });
  });
});
