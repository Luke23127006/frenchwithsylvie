import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url));
  }

  try {
    const stateToken = searchParams.get('state');
    let userId: string | null = null;

    if (stateToken) {
      // 1. Verify the state token to get the user ID robustly
      const payload = (await verifyToken(stateToken)) as TokenPayload | null;
      if (payload && payload.id) {
        userId = payload.id;
      }
    }

    // Fallback to cookie if state token is missing or invalid
    if (!userId) {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;

      if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      const payload = (await verifyToken(token)) as TokenPayload | null;
      if (!payload || !payload.id) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      userId = payload.id;
    }

    // 2. Exchange Google OAuth code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${request.nextUrl.origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to exchange token:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/dashboard?error=google_token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();

    // 3. Fetch user profile from Google to get the verified email
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user info:', await userResponse.text());
      return NextResponse.redirect(new URL('/dashboard?error=google_profile_fetch_failed', request.url));
    }

    const userData = await userResponse.json();
    const email = userData.email;

    if (!email) {
      return NextResponse.redirect(new URL('/dashboard?error=no_email_provided', request.url));
    }

    // 4. Upsert the email into user_notification_settings using Supabase Service Role Key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('user_notification_settings')
      .upsert(
        {
          user_id: userId,
          email: email,
          // We don't overwrite existing preferences if they just relink, 
          // but if it's new, the database defaults will apply.
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Failed to upsert notification settings:', error);
      return NextResponse.redirect(new URL('/dashboard?error=database_error', request.url));
    }

    // Successfully linked
    return NextResponse.redirect(new URL('/dashboard?success=email_linked', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=internal_error', request.url));
  }
}
