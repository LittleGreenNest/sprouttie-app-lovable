// src/components/user/Profile.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-toastify';

const LANGUAGE_LABELS = {
  english: 'English', mandarin: 'Mandarin', cantonese: 'Cantonese',
  malay: 'Malay', tamil: 'Tamil', other: 'Other',
};
const AGE_LABELS = { '0-1': '0–1 years', '1-2': '1–2 years', '2-3': '2–3 years', '3-5': '3–5 years' };
const SPEECH_LABELS = { not_yet: 'Not yet', few_single: 'A few single words', many_single: 'Many single words', short_phrases: 'Short phrases' };
const REPLY_LABELS = { english: 'Replies in English', mixes: 'Mixes languages', target: 'Replies in target language', rarely: 'Rarely replies' };
const TIME_LABELS = { '1-2': '1–2 minutes', '3-5': '3–5 minutes', '5-10': '5–10 minutes' };

const Profile = () => {
  const { currentUser, profile, refreshProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.user_metadata?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [userPlan, setUserPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [editingChild, setEditingChild] = useState(false);
  const [childForm, setChildForm] = useState({});
  const [savingChild, setSavingChild] = useState(false);
  const navigate = useNavigate();

  // Sync child form with profile
  useEffect(() => {
    if (profile) {
      setChildForm({
        child_age_band: profile.child_age_band || '',
        target_language: profile.target_language || '',
        speech_level: profile.speech_level || '',
        reply_pattern: profile.reply_pattern || '',
        daily_time_commitment: profile.daily_time_commitment || '',
      });
    }
  }, [profile]);

  const handleSaveChild = async () => {
    setSavingChild(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(childForm)
        .eq('id', currentUser.id);
      if (error) throw error;
      await refreshProfile(currentUser);
      setEditingChild(false);
    } catch (err) {
      console.error('Failed to save child profile:', err);
    } finally {
      setSavingChild(false);
    }
  };

  const toggleLanguage = (lang) => {
    const current = childForm.target_language ? childForm.target_language.split(',').filter(Boolean) : [];
    const next = current.includes(lang) ? current.filter(l => l !== lang) : [...current, lang];
    setChildForm({ ...childForm, target_language: next.join(',') });
  };

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
      toast.success(`Successfully subscribed to ${plan} plan! Your account will be updated shortly.`);
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

  // Handle profile update — persist name to Supabase auth + profiles
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      // Update Supabase auth user metadata
      const { data: updatedAuth, error: authErr } = await supabase.auth.updateUser({
        data: { name }
      });
      if (authErr) throw authErr;

      // Re-sync name state from the updated user to ensure UI reflects the change
      if (updatedAuth?.user?.user_metadata?.name) {
        setName(updatedAuth.user.user_metadata.name);
      }

      await refreshProfile(currentUser);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast.error('Failed to save — please try again');
    }
  };

  // Handle plan changes
  const handleUpgradePlan = () => {
    navigate('/plans');
  };

  const handleManageBilling = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('Unable to open billing portal. Please contact support.');
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      toast.error('Unable to open billing portal. Please contact support.');
    }
  };

  const handleDowngradeToFree = async () => {
    // User should cancel through Stripe billing portal
    handleManageBilling();
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
                onClick={handleManageBilling}
              >
                Manage Billing
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
                onClick={handleManageBilling}
              >
                Manage Billing
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
                  {currentUser?.user_metadata?.name || 'Not provided'}
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
                  {currentUser?.created_at 
                    ? new Date(currentUser.created_at).toLocaleDateString() 
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
      
      {/* Child's Profile Section */}
      <div className="mt-6 border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Child's Profile</h3>
          {!editingChild ? (
            <button
              onClick={() => setEditingChild(true)}
              className="text-sm text-[hsl(var(--sprouttie-green-dark))] hover:underline"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditingChild(false); setChildForm({ child_age_band: profile?.child_age_band || '', target_language: profile?.target_language || '', speech_level: profile?.speech_level || '', reply_pattern: profile?.reply_pattern || '', daily_time_commitment: profile?.daily_time_commitment || '' }); }} className="text-sm text-gray-500 hover:underline">Cancel</button>
              <button onClick={handleSaveChild} disabled={savingChild} className="text-sm font-medium text-white bg-[hsl(var(--sprouttie-green))] px-3 py-1 rounded-lg disabled:opacity-50">{savingChild ? 'Saving…' : 'Save'}</button>
            </div>
          )}
        </div>

        {!editingChild ? (
          <dl className="space-y-3">
            {[
              ['Age Band', AGE_LABELS[profile?.child_age_band] || 'Not set', '👶'],
              ['Target Language(s)', (profile?.target_language || '').split(',').filter(Boolean).map(l => LANGUAGE_LABELS[l] || l).join(', ') || 'Not set', '🌏'],
              ['Speech Level', SPEECH_LABELS[profile?.speech_level] || 'Not set', '🗣️'],
              ['Reply Pattern', REPLY_LABELS[profile?.reply_pattern] || 'Not set', '🔄'],
              ['Daily Commitment', TIME_LABELS[profile?.daily_time_commitment] || 'Not set', '⏱️'],
            ].map(([label, value, emoji]) => (
              <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-lg">{emoji}</span>
                <div>
                  <dt className="text-xs font-medium text-gray-500">{label}</dt>
                  <dd className="text-sm text-gray-900">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        ) : (
          <div className="space-y-4">
            {/* Age Band */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Age Band</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(AGE_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => setChildForm({ ...childForm, child_age_band: val })} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${childForm.child_age_band === val ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.1)] font-medium' : 'border-gray-200 hover:border-gray-300'}`}>{label}</button>
                ))}
              </div>
            </div>
            {/* Languages (multi) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target Language(s)</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(LANGUAGE_LABELS).map(([val, label]) => {
                  const selected = (childForm.target_language || '').split(',').includes(val);
                  return (
                    <button key={val} onClick={() => toggleLanguage(val)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${selected ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.1)] font-medium' : 'border-gray-200 hover:border-gray-300'}`}>{label} {selected && '✓'}</button>
                  );
                })}
              </div>
            </div>
            {/* Speech Level */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Speech Level</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SPEECH_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => setChildForm({ ...childForm, speech_level: val })} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${childForm.speech_level === val ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.1)] font-medium' : 'border-gray-200 hover:border-gray-300'}`}>{label}</button>
                ))}
              </div>
            </div>
            {/* Reply Pattern */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reply Pattern</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(REPLY_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => setChildForm({ ...childForm, reply_pattern: val })} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${childForm.reply_pattern === val ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.1)] font-medium' : 'border-gray-200 hover:border-gray-300'}`}>{label}</button>
                ))}
              </div>
            </div>
            {/* Time Commitment */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Daily Commitment</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TIME_LABELS).map(([val, label]) => (
                  <button key={val} onClick={() => setChildForm({ ...childForm, daily_time_commitment: val })} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${childForm.daily_time_commitment === val ? 'border-[hsl(var(--sprouttie-green))] bg-[hsl(var(--sprouttie-green)/0.1)] font-medium' : 'border-gray-200 hover:border-gray-300'}`}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {renderSubscriptionDetails()}

      {/* Install App */}
      <div className="mt-6 border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Install App</h3>
        <p className="text-sm text-gray-500 mb-3">Add Sprouttie to your home screen for quick access and a full-screen experience.</p>
        <button
          className="text-sm text-[hsl(var(--sprouttie-green))] font-medium hover:underline"
          onClick={() => navigate('/install')}
        >
          View install instructions →
        </button>
      </div>
      
      {/* Account Management Options */}
      <div className="mt-6 border rounded-lg p-6 bg-white shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Account Management</h3>
        
        <div className="space-y-4">
          <button 
            className="block text-sm text-blue-600 hover:text-blue-500"
            onClick={() => navigate('/forgot-password')}
          >
            Change Password
          </button>
          
          <button 
            className="block text-sm text-red-600 hover:text-red-500"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                // Handle account deletion (mock for now)
              }
            }}
          >
            Delete Account
          </button>
        </div>
      </div>

    </div>
  );
};

export default Profile;