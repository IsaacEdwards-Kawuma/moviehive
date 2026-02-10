import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export const metadata = {
  title: 'Terms of Service – MOVI HIVE',
  description: 'Terms of service for MOVI HIVE streaming service.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <main className="pt-24 px-4 sm:px-6 md:px-12 pb-16 max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-stream-text-secondary text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US')}</p>
        <div className="prose prose-invert prose-stream max-w-none space-y-4 text-stream-text-secondary">
          <p>
            By using MOVI HIVE (&quot;the service&quot;), you agree to these terms. If you do not agree, please do not use the service.
          </p>
          <h2 className="text-lg font-semibold text-white mt-6">Use of the service</h2>
          <p>
            You must use the service only for personal, non-commercial viewing. You may not redistribute, copy, or exploit content or the platform in ways that violate copyright or these terms.
          </p>
          <h2 className="text-lg font-semibold text-white mt-6">Account and profiles</h2>
          <p>
            You are responsible for keeping your account credentials secure. You may create multiple profiles under one account for household use. Do not share your account with others in a way that violates our policies.
          </p>
          <h2 className="text-lg font-semibold text-white mt-6">Content</h2>
          <p>
            Content available on the service is subject to licensing and regional availability. We may add or remove content at any time.
          </p>
          <h2 className="text-lg font-semibold text-white mt-6">Termination</h2>
          <p>
            We may suspend or terminate your access if you breach these terms. You may delete your account at any time from account settings.
          </p>
          <p className="mt-8">
            For questions, please refer to our Privacy Policy or contact us through the app.
          </p>
        </div>
        <Link href="/" className="inline-block mt-8 text-stream-accent hover:underline">
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
