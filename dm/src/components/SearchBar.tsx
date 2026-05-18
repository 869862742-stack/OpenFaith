import React from 'react';
import { useTranslation } from 'react-i18next';

function SearchBar() {
  const { t } = useTranslation();

  return (
    <div className="flex-1">
      <div
        className="flex items-center h-10 px-4 rounded-[30px] theme-transition"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="var(--icon-color)" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={t('home.searchPlaceholder')}
          className="flex-1 bg-transparent text-sm outline-none theme-transition"
          style={{
            color: 'var(--text-color)',
          }}
        />
      </div>
    </div>
  );
}

export default SearchBar;
