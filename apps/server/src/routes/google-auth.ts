import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { signAccessToken, signRefreshToken } from '../lib/auth.js';

export const googleAuthRouter = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback';
// Support comma-separated CORS_ORIGIN — take the first one as frontend URL
const FRONTEND_URL = (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',')[0].trim();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Step 1: Redirect user to Google's OAuth consent screen
googleAuthRouter.get('/google', (_req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(500).json({ error: 'Google OAuth is not configured' });
    return;
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Step 2: Handle callback from Google
googleAuthRouter.get('/google/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;

  if (oauthError || !code || typeof code !== 'string') {
    res.redirect(`${FRONTEND_URL}/?error=google_auth_failed`);
    return;
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text());
      res.redirect(`${FRONTEND_URL}/?error=google_token_failed`);
      return;
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      id_token?: string;
    };

    // Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      console.error('Google userinfo failed:', await userInfoRes.text());
      res.redirect(`${FRONTEND_URL}/?error=google_userinfo_failed`);
      return;
    }

    const googleUser = await userInfoRes.json() as {
      id: string;
      email: string;
      name: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!googleUser.email) {
      res.redirect(`${FRONTEND_URL}/?error=google_no_email`);
      return;
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.id },
          { email: googleUser.email },
        ],
      },
    });

    if (user) {
      // Link Google ID if not already linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.id,
            avatarUrl: user.avatarUrl ?? googleUser.picture ?? null,
            emailVerified: true,
          },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          googleId: googleUser.id,
          avatarUrl: googleUser.picture ?? null,
          emailVerified: true,
        },
      });

      // Auto-create a default profile for new Google users
      await prisma.profile.create({
        data: {
          userId: user.id,
          name: googleUser.name || googleUser.email.split('@')[0],
          avatar: googleUser.picture ?? null,
        },
      });
    }

    // Issue JWT tokens
    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

    // Set cookies (secure in production)
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: IS_PRODUCTION,
      domain: IS_PRODUCTION ? '.moviehive.com' : undefined,
    };
    res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

    // Redirect to frontend callback page with auth data in URL fragment
    const userData = encodeURIComponent(
      JSON.stringify({
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        role: user.role,
      })
    );

    res.redirect(
      `${FRONTEND_URL}/auth/google/callback?accessToken=${accessToken}&user=${userData}`
    );
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${FRONTEND_URL}/?error=google_auth_error`);
  }
});
