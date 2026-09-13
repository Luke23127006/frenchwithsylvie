import { getAverageGrade, getStudentOverview } from "../lib/analytics";
import { getSubmissionReview } from "../lib/submission-review";

describe("analytics averages", () => {
  it("matches the detail report using current grades, including past assignments", () => {
    const submissions = [
      { assignment_id: "a", grade: "80", feedback: null, numeric_grade: 100 },
      { assignment_id: "b", grade: "100", feedback: null, numeric_grade: null },
      { assignment_id: "past", grade: "60", feedback: null, numeric_grade: null },
      { assignment_id: "pending", grade: null, feedback: null, numeric_grade: 90 },
      { assignment_id: "feedback", grade: null, feedback: "Reviewed", numeric_grade: null },
    ];
    const overview = getStudentOverview({
      id: "student", full_name: "Student",
      assignment_assignees: [{ assignment_id: "a" }, { assignment_id: "b" }],
      submissions,
    });
    const detailAverage = getAverageGrade(submissions.map((s) => getSubmissionReview(s).numericGrade));
    expect(overview.average_grade).toBe(80);
    expect(overview.average_grade).toBe(detailAverage);
    expect(overview.total_assigned).toBe(2);
    expect(overview.total_submitted).toBe(2);
    expect(overview.completion_rate).toBe(100);
  });

  it("keeps zero grades and excludes pending or nonnumeric grades", () => {
    expect(getStudentOverview({
      id: "student", full_name: "Student", assignment_assignees: [],
      submissions: ["0", null, " ", "A"].map((grade) => ({ assignment_id: "a", grade })),
    }).average_grade).toBe(0);
  });

  it("returns no average for a student with no submissions", () => {
    expect(getStudentOverview({
      id: "student", full_name: "Student", assignment_assignees: null, submissions: null,
    })).toMatchObject({ average_grade: null, total_assigned: 0, total_submitted: 0, completion_rate: 0 });
  });

  it("averages only students with grades without excluding a zero average", () => {
    expect(getAverageGrade([100, 0, null])).toBe(50);
    expect(getAverageGrade([null])).toBeNull();
    expect(getAverageGrade([])).toBeNull();
  });
});
