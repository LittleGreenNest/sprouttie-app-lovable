import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link 
          to="/signup" 
          className="inline-flex items-center text-green-600 hover:text-green-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sign Up
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-green-800 mb-6">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: December 27, 2024</p>
          
          <div className="prose prose-green max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h2>
              <p className="text-gray-600">
                At Sprouttie, we take your privacy seriously. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our flashcard learning platform. 
                Please read this policy carefully.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">Personal Information</h3>
              <p className="text-gray-600">When you create an account, we collect:</p>
              <ul className="list-disc pl-6 text-gray-600 mt-2 space-y-1">
                <li>Email address</li>
                <li>Name (optional)</li>
                <li>Password (encrypted)</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">Usage Data</h3>
              <p className="text-gray-600">We automatically collect information about how you use the Service:</p>
              <ul className="list-disc pl-6 text-gray-600 mt-2 space-y-1">
                <li>Flashcard progress and learning history</li>
                <li>Session duration and frequency</li>
                <li>Features used within the app</li>
                <li>Device and browser information</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">Content You Create</h3>
              <p className="text-gray-600">
                We store content you create including custom flashcards, notes, spoken word records, 
                and any other learning materials you add to your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. How We Use Your Information</h2>
              <p className="text-gray-600">We use the collected information to:</p>
              <ul className="list-disc pl-6 text-gray-600 mt-2 space-y-1">
                <li>Provide and maintain the Service</li>
                <li>Track your learning progress and streaks</li>
                <li>Personalize your learning experience</li>
                <li>Generate AI-powered word suggestions and recommendations</li>
                <li>Send important service notifications</li>
                <li>Improve our Service through analytics</li>
                <li>Process payments for premium features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Data Storage and Security</h2>
              <p className="text-gray-600">
                Your data is stored securely using industry-standard encryption and security practices. 
                We use Supabase for our database infrastructure, which provides:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mt-2 space-y-1">
                <li>Encrypted data transmission (TLS/SSL)</li>
                <li>Row-level security for data isolation</li>
                <li>Regular security audits and updates</li>
                <li>Secure authentication with password hashing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Data Sharing</h2>
              <p className="text-gray-600">
                We do not sell your personal information. We may share data with:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mt-2 space-y-1">
                <li><strong>Service Providers:</strong> Third-party services that help us operate (payment processing, hosting)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Children's Privacy</h2>
              <p className="text-gray-600">
                Sprouttie is designed for parents to use with their children. We do not knowingly collect 
                personal information directly from children under 13. Parents create and manage accounts, 
                and any child-related learning data is associated with the parent's account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Your Rights</h2>
              <p className="text-gray-600">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-600 mt-2 space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data</li>
                <li>Opt out of marketing communications</li>
              </ul>
              <p className="text-gray-600 mt-2">
                To exercise these rights, please contact us at privacy@sprouttie.com.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Cookies and Tracking</h2>
              <p className="text-gray-600">
                We use essential cookies for authentication and session management. We do not use 
                third-party advertising cookies. You can control cookie settings through your browser.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Data Retention</h2>
              <p className="text-gray-600">
                We retain your data for as long as your account is active. If you delete your account, 
                we will delete your personal information within 30 days, except where retention is 
                required for legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Changes to This Policy</h2>
              <p className="text-gray-600">
                We may update this Privacy Policy periodically. We will notify you of significant changes 
                by posting a notice on the Service or sending you an email. Your continued use after 
                changes indicates acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">11. Contact Us</h2>
              <p className="text-gray-600">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p className="text-gray-600 mt-2">
                <strong>Email:</strong> privacy@sprouttie.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;