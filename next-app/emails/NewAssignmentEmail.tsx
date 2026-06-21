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

interface NewAssignmentEmailProps {
  studentName: string;
  assignmentTitle: string;
  teacherName: string;
  assignmentLink: string;
}

export const NewAssignmentEmail = ({
  studentName,
  assignmentTitle,
  teacherName,
  assignmentLink,
}: NewAssignmentEmailProps) => {
  const previewText = `New Assignment from ${teacherName}: ${assignmentTitle}`;
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
                You have a new assignment! 🎉
              </Heading>
              
              <Text className="text-slate-900 text-[18px] font-semibold leading-[28px] m-0 mb-[32px]">
                {teacherName} has just posted a new assignment for you: <i className="text-[#0b9f9f]">{assignmentTitle}</i> 🚀
              </Text>
              
              <Button
                className="bg-[#0b9f9f] rounded-full text-white text-[16px] font-bold no-underline px-8 py-3.5 inline-block"
                href={assignmentLink}
              >
                View Assignment &rarr;
              </Button>
            </Section>

            {/* Bottom White Section */}
            <Section className="p-[40px] pt-[32px] text-left">
              <Text className="text-slate-700 text-[15px] leading-[24px] m-0 mb-[16px]">
                Bonjour {studentName},
              </Text>
              
              <Text className="text-slate-700 text-[15px] leading-[24px] m-0 mb-[32px]">
                Don't forget to submit your work before the deadline to stay on track. If you have any questions or need help, feel free to reach out. Bon courage!
              </Text>

              <Text className="text-slate-700 text-[15px] leading-[24px] m-0 mb-[4px]">
                Happy studying 💙
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

export default NewAssignmentEmail;
