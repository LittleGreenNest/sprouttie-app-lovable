// components/CSVImport.js
import React, { useState } from 'react';
import { useFlashcards } from '../context/FlashcardContext';
import Papa from 'papaparse';

const CSVImport = ({ onClose }) => {
  const { 
    categories, 
    addCategory, 
    addFlashcard, 
    flashcards
  } = useFlashcards();
  
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [selectedCategoryMap, setSelectedCategoryMap] = useState({});
  
  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setImportData(null);
    setImportErrors([]);
    setImportSuccess(false);
    setImportResults(null);
    
    if (selectedFile) {
      parseCSVFile(selectedFile);
    }
  };

  // Parse the CSV file
  const parseCSVFile = (selectedFile) => {
    try {
      // Read the file
      Papa.parse(selectedFile, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setImportErrors(results.errors.map(err => `CSV parsing error: ${err.message}`));
            return;
          }
          
          // Process the data
          processCSVData(results.data);
        },
        error: (error) => {
          setImportErrors([`Error parsing file: ${error.message}`]);
        }
      });
    } catch (error) {
      setImportErrors([`Error reading file: ${error.message}`]);
    }
  };

  // Process the CSV data to extract categories and flashcards
  const processCSVData = (data) => {
    try {
      if (!data || data.length < 2) {
        setImportErrors([...importErrors, 'Invalid data format. The file should have at least a header row and one data row.']);
        return;
      }
      
      // Get headers (categories)
      const headers = data[0];
      
      // Initialize categories and flashcards objects
      const extractedCategories = [];
      const extractedFlashcards = {};
      const categoryMap = {};
      
      // Process each header as a category
      headers.forEach((header, index) => {
        if (header && typeof header === 'string') {
          // Clean the header string
          const categoryName = header.trim();
          
          // Skip empty headers
          if (categoryName) {
            extractedCategories.push({
              name: categoryName,
              index
            });
            
            // Initialize flashcards array for this category
            extractedFlashcards[categoryName] = [];
            
            // Create a mapping of extracted category to existing categories
            const existingCategory = categories.find(
              cat => cat.name.toLowerCase() === categoryName.toLowerCase()
            );
            
            if (existingCategory) {
              categoryMap[categoryName] = existingCategory.id;
            } else {
              categoryMap[categoryName] = null; // Will be created new
            }
          }
        }
      });
      
      // Set initial category mapping
      setSelectedCategoryMap(categoryMap);
      
      // Process data rows to extract flashcards
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        extractedCategories.forEach(category => {
          const word = row[category.index];
          
          // Only add non-empty words
          if (word && typeof word === 'string' && word.trim()) {
            const cleanWord = word.trim();
            
            // Check if this word already exists in the category
            extractedFlashcards[category.name].push({
              word: cleanWord,
              exists: doesFlashcardExist(cleanWord, categoryMap[category.name])
            });
          }
        });
      }
      
      // Set the extracted data
      setImportData({
        categories: extractedCategories,
        flashcards: extractedFlashcards
      });
    } catch (error) {
      setImportErrors([...importErrors, `Error processing data: ${error.message}`]);
    }
  };

  // Check if a flashcard already exists
  const doesFlashcardExist = (word, categoryId) => {
    if (!categoryId) return false;
    
    return flashcards.some(
      card => card.word.toLowerCase() === word.toLowerCase() && 
              card.categoryId === categoryId
    );
  };

  // Handle category mapping change
  const handleCategoryMapChange = (sourceCategoryName, targetCategoryId) => {
    setSelectedCategoryMap({
      ...selectedCategoryMap,
      [sourceCategoryName]: targetCategoryId
    });
  };

  // Handle import action
  const handleImport = async () => {
    if (!importData) return;
    
    setImporting(true);
    setImportErrors([]);
    
    try {
      const results = {
        categoriesAdded: [],
        categoriesMapped: [],
        flashcardsAdded: 0,
        flashcardsSkipped: 0
      };
      
      // Process each category
      for (const category of importData.categories) {
        const categoryName = category.name;
        let categoryId = selectedCategoryMap[categoryName];
        
        // If creating a new category
        if (!categoryId || categoryId === 'new') {
          const newCategory = addCategory(categoryName);
          categoryId = newCategory.id;
          results.categoriesAdded.push(categoryName);
        } else {
          results.categoriesMapped.push(categoryName);
        }
        
        // Add flashcards for this category
        for (const flashcard of importData.flashcards[categoryName]) {
          // Skip if the word already exists in this category
          if (doesFlashcardExist(flashcard.word, categoryId)) {
            results.flashcardsSkipped++;
          } else {
            addFlashcard(flashcard.word, categoryId);
            results.flashcardsAdded++;
          }
        }
      }
      
      setImportResults(results);
      setImportSuccess(true);
    } catch (error) {
      setImportErrors([...importErrors, `Import error: ${error.message}`]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Import Flashcards from CSV</h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select CSV File
        </label>
        
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
              >
                <span>Upload a CSV file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">CSV files only</p>
          </div>
        </div>
        
        {file && (
          <div className="mt-2 text-sm text-gray-600">
            Selected file: {file.name}
          </div>
        )}
      </div>
      
      {/* CSV Format Help */}
      <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements:</h3>
        <ul className="list-disc pl-5 text-sm text-blue-700">
          <li>First row should contain category names (e.g., "Body Parts", "Clothing", "Animals")</li>
          <li>Each column under a category should contain words for that category</li>
          <li>Example: 
            <pre className="mt-1 bg-white p-2 rounded text-xs overflow-x-auto">
              Body Parts,Clothing,Animals<br/>
              arm,shirt,dog<br/>
              leg,pants,cat<br/>
              head,shoes,bird
            </pre>
          </li>
        </ul>
      </div>
      
      {/* Import Errors */}
      {importErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 rounded-md border border-red-200">
          <h3 className="text-sm font-medium text-red-800 mb-2">Errors:</h3>
          <ul className="list-disc pl-5 text-sm text-red-700">
            {importErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Preview and Mapping */}
      {importData && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Category Mapping</h3>
            <p className="text-sm text-gray-600 mb-3">
              For each category in your CSV file, you can either map it to an existing category or create a new one.
            </p>
            
            <div className="space-y-4">
              {importData.categories.map((category) => (
                <div key={category.name} className="flex items-center">
                  <div className="w-1/3 font-medium">{category.name}</div>
                  <div className="w-2/3">
                    <select
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                      value={selectedCategoryMap[category.name] || 'new'}
                      onChange={(e) => handleCategoryMapChange(category.name, e.target.value)}
                    >
                      <option value="new">Create new category</option>
                      {categories.map((existingCategory) => (
                        <option key={existingCategory.id} value={existingCategory.id}>
                          Map to: {existingCategory.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Flashcards Preview</h3>
            <div className="space-y-4">
              {importData.categories.map((category) => (
                <div key={category.name} className="border rounded-md p-4">
                  <h4 className="font-medium text-green-700 mb-2">{category.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {importData.flashcards[category.name].map((flashcard, index) => (
                      <div 
                        key={index}
                        className={`px-3 py-1 rounded-full text-sm ${
                          flashcard.exists
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : 'bg-green-100 text-green-800 border border-green-300'
                        }`}
                      >
                        {flashcard.word}
                        {flashcard.exists && (
                          <span className="ml-1 text-xs">
                            (exists)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import Flashcards'}
            </button>
          </div>
        </>
      )}
      
      {/* Import Results */}
      {importSuccess && importResults && (
        <div className="mt-6 p-4 bg-green-50 rounded-md border border-green-200">
          <h3 className="text-lg font-medium text-green-800 mb-2">Import Successful!</h3>
          <ul className="list-disc pl-5 text-sm text-green-700">
            {importResults.categoriesAdded.length > 0 && (
              <li>Created {importResults.categoriesAdded.length} new categories: {importResults.categoriesAdded.join(', ')}</li>
            )}
            {importResults.categoriesMapped.length > 0 && (
              <li>Mapped to {importResults.categoriesMapped.length} existing categories: {importResults.categoriesMapped.join(', ')}</li>
            )}
            <li>Added {importResults.flashcardsAdded} new flashcards</li>
            <li>Skipped {importResults.flashcardsSkipped} duplicate flashcards</li>
          </ul>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVImport;