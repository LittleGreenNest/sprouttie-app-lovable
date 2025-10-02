import React, { useState } from 'react';

const LGNFlashcardTracker = () => {
  // Current date formatted as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // Sample flashcard sets
  const [sets] = useState([
    { id: 1, name: 'Set 1', words: ['Dog', 'Car', 'Chair', 'Tree', 'Hand'] },
    { id: 2, name: 'Set 2', words: ['Cat', 'Truck', 'Table', 'Flower', 'Foot'] },
    { id: 3, name: 'Set 3', words: ['Horse', 'Bus', 'Bed', 'River', 'Head'] },
    { id: 4, name: 'Set 4', words: ['Lion', 'Train', 'Lamp', 'Mountain', 'Ear'] },
    { id: 5, name: 'Set 5', words: ['Tiger', 'Airplane', 'Sofa', 'Sun', 'Eye'] }
  ]);
  
  // Track which sets are selected for today
  const [selectedSets, setSelectedSets] = useState([]);
  
  // Track flash counts for each set
  const [flashCounts, setFlashCounts] = useState({});
  
  // Track engagement and notes
  const [engagement, setEngagement] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [notes, setNotes] = useState('');
  
  // Toggle set selection
  const toggleSet = (setId) => {
    if (selectedSets.includes(setId)) {
      setSelectedSets(selectedSets.filter(id => id !== setId));
    } else {
      setSelectedSets([...selectedSets, setId]);
    }
  };
  
  // Increment flash count
  const incrementCount = (setId) => {
    setFlashCounts({
      ...flashCounts,
      [setId]: (flashCounts[setId] || 0) + 1
    });
  };
  
  // Decrement flash count
  const decrementCount = (setId) => {
    if (flashCounts[setId] && flashCounts[setId] > 0) {
      setFlashCounts({
        ...flashCounts,
        [setId]: flashCounts[setId] - 1
      });
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Sprouttie</h1>
      <h2 className="text-xl text-green-700 mb-6">Sprouttie Flashcard Tracker</h2>
      
      {/* Set Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="font-medium mb-3">Select sets for today:</h3>
        <div className="flex flex-wrap gap-2">
          {sets.map((set) => (
            <button
              key={set.id}
              onClick={() => toggleSet(set.id)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedSets.includes(set.id)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {set.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tracking Selected Sets */}
      {selectedSets.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="font-medium mb-3">Track flashes:</h3>
          <div className="space-y-4">
            {sets
              .filter((set) => selectedSets.includes(set.id))
              .map((set) => (
                <div key={set.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{set.name}</h4>
                    <div className="text-gray-500 text-sm">{set.words.length} words</div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    Words: {set.words.join(', ')}
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => decrementCount(set.id)}
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                    >
                      -
                    </button>
                    
                    <span className="mx-3 text-xl font-medium">
                      {flashCounts[set.id] || 0}
                    </span>
                    
                    <button
                      onClick={() => incrementCount(set.id)}
                      className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Engagement Tracking */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-medium mb-3">Track Child's Engagement</h3>
        
        {/* Engagement Rating */}
        <div className="mb-4">
          <div className="text-sm mb-2">How engaged was your child today?</div>
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setEngagement(rating)}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  rating <= engagement
                    ? 'bg-yellow-400 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {rating <= 2 ? '😐' : rating <= 4 ? '😊' : '😃'}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            1 = Minimal Interest • 5 = Highly Engaged
          </div>
        </div>
        
        {/* Time of Day */}
        <div className="mb-4">
          <div className="text-sm mb-2">When was your child most engaged?</div>
          <div className="flex flex-wrap gap-2">
            {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
              <button
                key={time}
                onClick={() => setTimeOfDay(time)}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeOfDay === time
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {time} {time === 'Morning' ? '🌅' : time === 'Afternoon' ? '☀️' : time === 'Evening' ? '🌆' : '🌙'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2" htmlFor="notes">
            Notes for Today
          </label>
          <textarea
            id="notes"
            rows="3"
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Record observations, words recognized, special moments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default LGNFlashcardTracker;
