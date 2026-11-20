import { CheckCircle2, Circle } from "lucide-react";

interface ChecklistProps {
  passwordStatus: 'completed' | 'skipped' | null;
  assignmentViewed: boolean;
  assignmentSubmitted: boolean;
}

export default function OnboardingChecklist({ passwordStatus, assignmentViewed, assignmentSubmitted }: ChecklistProps) {
  return (
    <div className="fixed bottom-6 right-6 bg-white shadow-xl rounded-xl p-5 border w-80 z-40">
      <h3 className="font-semibold text-lg mb-4">Onboarding Progress</h3>
      <ul className="space-y-3">
        <li className="flex items-center gap-3">
          {passwordStatus === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : passwordStatus === 'skipped' ? (
            <Circle className="w-5 h-5 text-gray-400" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
          <span className={passwordStatus === 'completed' ? 'text-gray-900' : 'text-gray-500'}>
            {passwordStatus === 'skipped' ? 'Change Password (Skipped)' : 'Change Password'}
          </span>
        </li>
        <li className="flex items-center gap-3">
          {assignmentViewed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" data-testid="check-viewed" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" data-testid="uncheck-viewed" />
          )}
          <span className={assignmentViewed ? 'text-gray-900' : 'text-gray-500'}>View Assignment</span>
        </li>
        <li className="flex items-center gap-3">
          {assignmentSubmitted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" data-testid="check-submitted" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" data-testid="uncheck-submitted" />
          )}
          <span className={assignmentSubmitted ? 'text-gray-900' : 'text-gray-500'}>Submit Assignment</span>
        </li>
      </ul>
    </div>
  );
}
