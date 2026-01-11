import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, HelpCircle } from 'lucide-react';

const Support = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center text-green-600 hover:text-green-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-green-800 mb-6">Support</h1>
          <p className="text-gray-600 mb-8">
            We're here to help you and your little one on your learning journey. 
            Choose the best way to reach us below.
          </p>
          
          <div className="space-y-6">
            {/* Email Support */}
            <div className="flex items-start gap-4 p-6 bg-green-50 rounded-xl">
              <div className="p-3 bg-green-100 rounded-full">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Email Us</h2>
                <p className="text-gray-600 mb-3">
                  For general inquiries, feedback, or assistance with your account.
                </p>
                <a 
                  href="mailto:support@sprouttie.com" 
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  support@sprouttie.com
                </a>
              </div>
            </div>

            {/* FAQ */}
            <div className="flex items-start gap-4 p-6 bg-gray-100 rounded-xl">
              <div className="p-3 bg-gray-200 rounded-full">
                <HelpCircle className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Frequently Asked Questions</h2>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-medium text-gray-800">How do I reset my password?</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Click "Forgot Password" on the login page and follow the instructions sent to your email.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Can I use Sprouttie on multiple devices?</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Yes! Your account syncs across all devices. Just log in with the same credentials.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">How do I cancel my subscription?</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Go to your Profile page and click "Manage Subscription" to update or cancel your plan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="flex items-start gap-4 p-6 border border-gray-200 rounded-xl">
              <div className="p-3 bg-blue-50 rounded-full">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Response Time</h2>
                <p className="text-gray-600">
                  We typically respond within 24-48 hours during business days. 
                  Thank you for your patience!
                </p>
              </div>
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex gap-6 text-sm">
            <Link to="/terms" className="text-gray-500 hover:text-green-600">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-gray-500 hover:text-green-600">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
