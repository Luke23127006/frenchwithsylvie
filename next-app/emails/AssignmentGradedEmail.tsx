import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface AssignmentGradedEmailProps {
  studentName: string;
  assignmentTitle: string;
  teacherName: string;
  assignmentLink: string;
  grade?: string | null;
  feedback?: string | null;
}

export const AssignmentGradedEmail = ({
  studentName,
  assignmentTitle,
  teacherName,
  assignmentLink,
  grade,
  feedback,
}: AssignmentGradedEmailProps) => {
  const previewText = `${teacherName} graded your assignment: ${assignmentTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans my-auto mx-auto px-2 py-8">
          <Container className="border border-solid border-slate-200 rounded-xl my-[40px] mx-auto p-[20px] bg-white w-[465px] shadow-sm">
            <Section className="mt-[32px]">
              <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[30px] mx-0">
                Assignment Graded! 🎉
              </Heading>
              
              <Text className="text-slate-700 text-[16px] leading-[24px]">
                Bonjour {studentName},
              </Text>
              
              <Text className="text-slate-700 text-[16px] leading-[24px]">
                <strong>{teacherName}</strong> has graded your submission for <strong className="text-[#0b9f9f]">{assignmentTitle}</strong>.
              </Text>

              {(grade || feedback) && (
                <Section className="bg-slate-50 border border-slate-200 rounded-lg p-4 my-6">
                  {grade && (
                    <Text className="text-slate-900 text-[18px] font-bold m-0 mb-2">
                      Grade: <span className="text-[#0b9f9f]">{grade}</span>
                    </Text>
                  )}
                  {feedback && (
                    <div 
                      className="text-slate-700 text-[16px] italic m-0"
                      dangerouslySetInnerHTML={{ __html: feedback }}
                    />
                  )}
                </Section>
              )}

              <Section className="text-center mt-[32px] mb-[32px]">
                <Button
                  className="bg-[#0b9f9f] rounded text-white text-[14px] font-semibold no-underline text-center px-6 py-3"
                  href={assignmentLink}
                >
                  View Details
                </Button>
              </Section>
              
              <Text className="text-slate-700 text-[16px] leading-[24px]">
                Keep up the great work!
              </Text>
              
              <Hr className="border border-solid border-slate-200 my-[26px] mx-0 w-full" />
              
              <Text className="text-slate-400 text-[12px] leading-[24px] text-center">
                French with Sylvie • Educational Platform
                <br />
                You are receiving this email because you opted into grading notifications.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AssignmentGradedEmail;
