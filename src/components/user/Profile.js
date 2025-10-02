// src/components/user/Profile.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Add this import

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [userPlan, setUserPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const navigate = useNavigate();

  // Fetch user's plan data from database
  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!currentUser) return;
      
      setPlanLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('plan, subscription_status, current_period_end')
          .eq('id', currentUser.id)
          .single();
          
        if (error) {
          console.error('Error fetching user plan:', error);
        } else if (data) {
          setUserPlan(data);
        }
      } catch (err) {
        console.error('Error fetching plan:', err);
      } finally {
        setPlanLoading(false);
      }
    };

    fetchUserPlan();
  }, [currentUser]);

  // Handle successful payment redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const plan = urlParams.get('plan');
    
    if (paymentStatus === 'success' && plan) {
      console.log('Payment successful, refreshing user plan...');
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Wait a bit for webhook to process, then refresh plan
      setTimeout(() => {
        const fetchUpdatedPlan = async () => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('plan, subscription_status, current_period_end')
              .eq('id', currentUser.id)
              .single();
              
            if (data) {
              setUserPlan(data);
            }
          } catch (err) {
            console.error('Error refreshing plan:', err);
          }
        };
        fetchUpdatedPlan();
      }, 2000);
      
      // Show success message
      alert(`Successfully subscribed to ${plan} plan! Your account will be updated shortly.`);
    }
  }, [currentUser]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Handle profile update (mock for now)
  const handleUpdateProfile = (e) => {
    e.preventDefault();
    // In a real app, this would call an API endpoint
    console.log('Profile update:', { name, email });
    setIsEditing(false);
    // For now, we'll just update the local display
  };

  // Handle plan changes
  const handleUpgradePlan = () => {
    navigate('/plans');
  };

  const handleDowngradeToFree = async () => {
    // In a real app, this would call your backend to cancel the subscription
    try {
      console.log('Downgrading to free plan...');
      // For now, just update locally - you'll need to implement actual cancellation
      setUserPlan({ ...userPlan, plan: 'free', subscription_status: 'canceled' });
      setShowDowngradeConfirm(false);
      alert('Your subscription has been canceled. You will remain on your current plan until the end of your billing period.');
    } catch (error) {
      console.error('Error downgrading plan:', error);
      alert('Error canceling subscription. Please try again.');
    }
  };

  // Display subscription plan details
  const renderSubscriptionDetails = () => {
    if (planLoading) {
      return (
        <div className="mt-6 border rounded-lg p-6 bg-white shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Subscription Plan</h3>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      );
    }

    const plan = userPlan?.plan || 'free';
    const status = userPlan?.subscription_status || 'free';
    const periodEnd = userPlan?.current_period_end;
    
    return (
      <div className="mt-6 border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Subscription Plan</h3>
        
        {plan === 'free' ? (
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Free Plan
            </span>
            <p className="mt-2 text-sm text-gray-600">
              You're currently on the Free plan. Upgrade to access more features like printable PDF flashcards and unlimited AI stories.
            </p>
            <button 
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              onClick={handleUpgradePlan}
            >
              Upgrade Plan
            </button>
          </div>
        ) : plan === 'print' ? (
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Print Plan - $1/month
            </span>
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                You're on the Print Plan with access to printable PDF flashcards.
              </p>
              {periodEnd && (
                <p className="text-xs text-gray-500 mt-1">
                  {status === 'active' ? 'Next billing date: ' : 'Active until: '}
                  {new Date(periodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="mt-4 space-x-3">
              <button 
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={handleUpgradePlan}
              >
                Upgrade to Pro
              </button>
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={() => setShowDowngradeConfirm(true)}
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        ) : plan === 'pro' ? (
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Pro Sprout Plan - $3/month
            </span>
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                You're on the Pro Sprout Plan with unlimited story generation and all features.
              </p>
              {periodEnd && (
                <p className="text-xs text-gray-500 mt-1">
                  {status === 'active' ? 'Next billing date: ' : 'Active until: '}
                  {new Date(periodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="mt-4">
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={() => setShowDowngradeConfirm(true)}
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Personal details and preferences
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Logout
          </button>
        </div>
        
        {isEditing ? (
          <div className="border-t border-gray-200">
            <form onSubmit={handleUpdateProfile} className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div className="col-span-6 sm:col-span-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 focus:ring-green-500 focus:border-green-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Full name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {currentUser?.name || 'Not provided'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {currentUser?.email || 'Not provided'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Account created</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {currentUser?.createdAt 
                    ? new Date(currentUser.createdAt).toLocaleDateString() 
                    : 'Unknown'}
                </dd>
              </div>
              
              <div className="bg-white px-4 py-5 sm:px-6">
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Edit Profile
                </button>
              </div>
            </dl>
          </div>
        )}
      </div>
      
      {renderSubscriptionDetails()}
      
      {/* Account Management Options */}
      <div className="mt-6 border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Account Management</h3>
        
        <div className="space-y-4">
          <button 
            className="block text-sm text-blue-600 hover:text-blue-500"
            onClick={() => navigate('/change-password')}
          >
            Change Password
          </button>
          
          <button 
            className="block text-sm text-red-600 hover:text-red-500"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                // Handle account deletion (mock for now)
                console.log('Account deletion requested');
              }
            }}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Downgrade Confirmation Modal */}
      {showDowngradeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDowngradeConfirm(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cancel Subscription</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to cancel your subscription? You'll continue to have access to your current plan until the end of your billing period, then you'll be moved to the Free plan.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDowngradeConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleDowngradeToFree}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;