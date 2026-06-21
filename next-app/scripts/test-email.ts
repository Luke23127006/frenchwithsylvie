import { config } from 'dotenv';
import { Resend } from 'resend';
import React from 'react';
import { NewAssignmentEmail } from '../emails/NewAssignmentEmail';
import { AssignmentGradedEmail } from '../emails/AssignmentGradedEmail';

// Load environment variables from .env.local
config({ path: '.env.local' });

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY is not defined in .env.local');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('❌ Please provide a target email address.');
  console.error('Usage: npm run test:email <your-email@example.com>');
  process.exit(1);
}

async function sendTestEmails() {
  console.log(`📨 Sending test emails to ${targetEmail}...`);

  try {
    const newAssignmentResp = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: targetEmail,
      subject: '[Test] You have a new assignment!',
      react: React.createElement(NewAssignmentEmail, {
        studentName: 'Test Student',
        assignmentTitle: 'Les Verbes Réguliers (Test)',
        teacherName: 'Sylvie',
        assignmentLink: 'http://localhost:3000/assignment/123',
      }),
    });

    console.log('✅ New Assignment Email Response:', newAssignmentResp);

    const gradedResp = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: targetEmail,
      subject: '[Test] Assignment Graded!',
      react: React.createElement(AssignmentGradedEmail, {
        studentName: 'Test Student',
        assignmentTitle: 'Les Verbes Réguliers (Test)',
        teacherName: 'Sylvie',
        assignmentLink: 'http://localhost:3000/assignment/123',
        grade: '95/100',
        feedback: '<p>Excellent work! Your pronunciation is getting much better. Keep practicing the <strong>-er</strong> verbs.</p>',
      }),
    });

    console.log('✅ Graded Email Response:', gradedResp);

    console.log('🎉 Test emails sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send test emails:', error);
  }
}

sendTestEmails();
