import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Terms = () => {
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
          <h1 className="text-3xl font-bold text-green-800 mb-6">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: December 27, 2024</p>
          
          <div className="prose prose-green max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-600">
                By accessing and using Sprouttie ("the Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Description of Service</h2>
              <p className="text-gray-600">
                Sprouttie is a flashcard-based learning platform designed to help parents teach children to read 
                using whole-word and right-brain teaching methods. The Service includes flashcard management, 
                progress tracking, pronunciation guides, and personalized learning recommendations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. User Accounts</h2>
              <p className="text-gray-600">
                To use certain features of the Service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mt-2 space-y-1">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information during registration</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. User Content</h2>
              <p className="text-gray-600">
                You retain ownership of any content you create within the Service, including custom flashcards, 
                notes, and tracking data. By using the Service, you grant us a limited license to store and 
                process your content solely for the purpose of providing the Service to you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Acceptable Use</h2>
              <p className="text-gray-600">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-600 mt-2 space-y-1">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Upload malicious code or content</li>
                <li>Share your account with others or create multiple accounts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Subscription and Payments</h2>
              <p className="text-gray-600">
                Some features of Sprouttie require a paid subscription. By subscribing, you agree to pay 
                the applicable fees. Subscriptions automatically renew unless cancelled before the renewal date. 
                Refunds are handled on a case-by-case basis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Intellectual Property</h2>
              <p className="text-gray-600">
                The Service, including its design, features, and content (excluding user-generated content), 
                is owned by Sprouttie and protected by intellectual property laws. You may not copy, modify, 
                or distribute any part of the Service without our written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Disclaimer of Warranties</h2>
              <p className="text-gray-600">
                The Service is provided "as is" without warranties of any kind. We do not guarantee that 
                the Service will be uninterrupted, error-free, or that it will meet your specific learning 
                goals. Educational outcomes depend on many factors beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Limitation of Liability</h2>
              <p className="text-gray-600">
                To the maximum extent permitted by law, Sprouttie shall not be liable for any indirect, 
                incidental, special, or consequential damages arising from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">10. Changes to Terms</h2>
              <p className="text-gray-600">
                We may update these Terms from time to time. We will notify you of significant changes 
                by posting a notice on the Service or sending you an email. Continued use of the Service 
                after changes constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">11. Contact Us</h2>
              <p className="text-gray-600">
                If you have questions about these Terms, please contact us at support@sprouttie.com.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;