import { supabase } from '../lib/supabase';

describe('Supabase Client Connection', () => {
  it('should successfully connect to the assignments table', async () => {
    // Attempt to query the assignments table to verify the connection
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .limit(1);

    // If there's a configuration or connection error, we expect it to be caught here
    expect(error).toBeNull();
    // Data should be an array (even if empty, meaning connection succeeded)
    expect(Array.isArray(data)).toBe(true);
  });
});
