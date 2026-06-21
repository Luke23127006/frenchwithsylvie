import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ? `https://${process.env.NEXT_PUBLIC_APP_URL}` : 'http://localhost:3000';

  // Use a public url of the actual logo for local testing so email clients can render it
  const logoUrl = process.env.NODE_ENV === 'development'
    ? 'https://files.catbox.moe/r0erhy.jpg'
    : `${baseUrl}/logo.jpg`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans my-auto mx-auto px-2 py-8">
          <Container className="mx-auto w-[600px] max-w-full">
            
            {/* Top Card Section (Studocu Style) */}
            <Section className="bg-[#e6f5f5] rounded-3xl p-[40px] text-left">
              {/* Brand Logo/Text */}
              <Section className="mb-[32px]">
                <Img
                  src={logoUrl}
                  width="48"
                  height="48"
                  alt="French with Sylvie"
                  className="rounded-full inline-block mr-3 align-middle"
                />
                <Text className="text-slate-900 font-bold text-[20px] tracking-tight m-0 inline-block align-middle">
                  French with Sylvie
                </Text>
              </Section>
              
              <Heading className="text-slate-900 text-[36px] font-bold m-0 mb-[24px] leading-[1.1] tracking-tight">
                Assignment Graded! ✨
              </Heading>
              
              <Text className="text-slate-900 text-[18px] font-semibold leading-[28px] m-0 mb-[24px]">
                {teacherName} has graded your submission for <i className="text-[#0b9f9f]">{assignmentTitle}</i>.
              </Text>

              {(grade || feedback) && (
                <Section className="bg-white/60 rounded-2xl p-[24px] mb-[32px]">
                  {grade && (
                    <Text className="text-slate-900 text-[20px] font-bold m-0 mb-[8px]">
                      Grade: <span className="text-[#0b9f9f]">{grade}</span>
                    </Text>
                  )}
                  {feedback && (
                    <div 
                      className="text-slate-800 text-[16px] italic m-0 leading-[24px]"
                      dangerouslySetInnerHTML={{ __html: feedback }}
                    />
                  )}
                </Section>
              )}
              
              <Button
                className="bg-[#0b9f9f] rounded-full text-white text-[16px] font-bold no-underline px-8 py-3.5 inline-block"
                href={assignmentLink}
              >
                View Details &rarr;
              </Button>
            </Section>

            {/* Bottom White Section */}
            <Section className="p-[40px] pt-[32px] text-left">
              <Text className="text-slate-700 text-[15px] leading-[24px] m-0 mb-[16px]">
                Bonjour {studentName},
              </Text>
              
              <Text className="text-slate-700 text-[15px] leading-[24px] m-0 mb-[32px]">
                Great job completing your assignment! Review your feedback and keep up the excellent work. Every step brings you closer to fluency!
              </Text>

              <Text className="text-slate-700 text-[15px] leading-[24px] m-0 mb-[4px]">
                Keep it up 💙
              </Text>
              <Text className="text-slate-700 text-[15px] leading-[24px] m-0 font-medium">
                {teacherName} from French with Sylvie
              </Text>
            </Section>

          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AssignmentGradedEmail;
