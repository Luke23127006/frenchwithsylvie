import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface NewAssignmentEmailProps {
  studentName: string;
  assignmentTitle: string;
  teacherName: string;
  assignmentLink: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
  : 'http://localhost:3000';

export const NewAssignmentEmail = ({
  studentName,
  assignmentTitle,
  teacherName,
  assignmentLink,
}: NewAssignmentEmailProps) => {
  const previewText = `New Assignment from ${teacherName}: ${assignmentTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 font-sans my-auto mx-auto px-2 py-8">
          <Container className="border border-solid border-slate-200 rounded-xl my-[40px] mx-auto p-[20px] bg-white w-[465px] shadow-sm">
            <Section className="mt-[32px]">
              <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[30px] mx-0">
                You have a new assignment! 📚
              </Heading>
              
              <Text className="text-slate-700 text-[16px] leading-[24px]">
                Bonjour {studentName},
              </Text>
              
              <Text className="text-slate-700 text-[16px] leading-[24px]">
                <strong>{teacherName}</strong> has just posted a new assignment for you: <strong className="text-indigo-600">{assignmentTitle}</strong>.
              </Text>

              <Section className="text-center mt-[32px] mb-[32px]">
                <Button
                  className="bg-indigo-600 rounded text-white text-[14px] font-semibold no-underline text-center px-6 py-3"
                  href={assignmentLink}
                >
                  View Assignment
                </Button>
              </Section>
              
              <Text className="text-slate-700 text-[16px] leading-[24px]">
                Don't forget to submit your work before the deadline. Bon courage!
              </Text>
              
              <Hr className="border border-solid border-slate-200 my-[26px] mx-0 w-full" />
              
              <Text className="text-slate-400 text-[12px] leading-[24px] text-center">
                French with Sylvie • Educational Platform
                <br />
                You are receiving this email because you opted into new assignment notifications.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default NewAssignmentEmail;
