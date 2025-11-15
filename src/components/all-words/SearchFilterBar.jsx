import React from 'react';
import { Search } from 'lucide-react';

const SearchFilterBar = ({ 
  query, 
  onQueryChange, 
  selectedCategory, 
  onCategoryChange, 
  sortBy, 
  onSortChange,
  categories 
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search words..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white transition-all cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white transition-all cursor-pointer"
        >
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="most">Most Words First</option>
          <option value="least">Least Words First</option>
          <option value="dateAdded">Date Added to App (Newest)</option>
          <option value="dateAddedOld">Date Added to App (Oldest)</option>
          <option value="dateFlashed">Date First Flashed (Newest)</option>
          <option value="dateFlashedOld">Date First Flashed (Oldest)</option>
        </select>
      </div>
    </div>
  );
};

export default SearchFilterBar;
