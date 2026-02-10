import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export const metadata = {
  title: 'Privacy Policy – MOVI HIVE',
  description: 'Privacy policy for MOVI HIVE streaming service.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <main className="pt-24 px-4 sm:px-6 md:px-12 pb-16 max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-stream-text-secondary text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US')}</p>
        <div className="prose prose-invert prose-stream max-w-none space-y-4 text-stream-text-secondary">
          <p>
            MOVI HIVE (&quot;we&quot;, &quot;our&quot;) respects your privacy. This page summarises how we handle your information when you use our streaming service.
          </p>
          <h2 className="text-lg font-semibold text-white mt-6">Information we collect</h2>
          <p>
            We collect information you provide when you register (e.g. email, password), create profiles (name, avatar), and when you use the service (watch history, my list, search history) to personalise your experience.
          </p>
          <h2 className="text-lg font-semibold text-white mt-6">How we use it</h2>
          <p>
            We use your data to provide the service (streaming, recommendations, continue watching), to communicate with you, and to improve our product. We do not sell your personal information to third parties.
          </p>
          <h2 className="text-lg font-semibold text-white mt-6">Cookies and storage</h2>
          <p>
            We use cookies and local storage for authentication and preferences. You can clear these in your browser settings.
          </p>
          <h2 className="text-lg font-semibold text-white mt-6">Your rights</h2>
          <p>
            You can access and update your profile and preferences in the app. You may request deletion of your account and associated data from your account settings.
          </p>
          <p className="mt-8">
            For questions or requests, contact us through the contact details provided in the app or on the main website.
          </p>
        </div>
        <Link href="/" className="inline-block mt-8 text-stream-accent hover:underline">
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
