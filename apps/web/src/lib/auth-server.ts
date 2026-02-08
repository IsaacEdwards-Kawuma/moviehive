import { cookies } from 'next/headers';

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Cookie: `accessToken=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const user = await res.json();
    const profilesRes = await fetch(`${API}/api/profiles`, {
      headers: { Cookie: `accessToken=${token}` },
      cache: 'no-store',
    });
    const profiles = profilesRes.ok ? await profilesRes.json() : [];
    return {
      user,
      profiles,
      profile: profiles.length > 0 ? profiles[0] : null,
    };
  } catch {
    return null;
  }
}
