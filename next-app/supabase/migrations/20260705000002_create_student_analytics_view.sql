-- Create a view for student grade analytics
CREATE OR REPLACE VIEW public.student_analytics_view AS
SELECT 
    u.id AS student_id,
    u.full_name AS student_name,
    COUNT(DISTINCT aa.assignment_id) AS total_assigned,
    COUNT(DISTINCT s.id) AS total_submitted,
    CASE 
        WHEN COUNT(DISTINCT aa.assignment_id) = 0 THEN 0
        ELSE (COUNT(DISTINCT s.id)::float / COUNT(DISTINCT aa.assignment_id)::float) * 100 
    END AS completion_rate,
    AVG(s.numeric_grade) AS average_grade
FROM 
    public.users u
LEFT JOIN 
    public.assignment_assignees aa ON aa.student_id = u.id
LEFT JOIN 
    public.submissions s ON s.student_id = u.id AND s.assignment_id = aa.assignment_id
WHERE 
    u.role = 'student'
GROUP BY 
    u.id, u.full_name;

-- Grant permissions for Next.js to query the view
GRANT SELECT ON public.student_analytics_view TO anon, authenticated, service_role;
