// src/pages/pdf-success.js
import React from 'react';
import { Link } from 'react-router-dom';

const PDFSuccessPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="text-4xl mb-4">✨</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're In!</h1>
        </div>
        
        <div className="mb-8">
          <p className="text-gray-600 mb-4">
            Thanks for subscribing to the PDF Plan on Sprouttie! 🧠📄
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your PDF Plan is activated. Ready to print flashcards that spark your little one's curiosity? ✨
          </p>
        </div>
        
        <Link to="/flashcards">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
            Start Exploring
          </button>
        </Link>
      </div>
    </div>
  );
};

export default PDFSuccessPage;