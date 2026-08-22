// src/components/ui/Tabs.jsx
// TABS DE NAVEGACIÓN

import React from 'react';

const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  variant = 'default', // default, pills, underlined
  className = '',
}) => {
  const variants = {
    default: {
      container: 'border-b border-gray-200',
      tab: (isActive) => `
        px-4 py-2.5 text-sm font-medium transition-colors
        ${isActive 
          ? 'text-[#0f766e] border-b-2 border-[#0f766e]' 
          : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
        }
      `,
    },
    pills: {
      container: 'flex gap-1 bg-gray-100 rounded-xl p-1',
      tab: (isActive) => `
        px-4 py-2 text-sm font-medium rounded-lg transition-colors
        ${isActive 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }
      `,
    },
    underlined: {
      container: 'flex gap-6 border-b border-gray-200',
      tab: (isActive) => `
        px-1 py-2.5 text-sm font-medium transition-colors border-b-2
        ${isActive 
          ? 'border-[#0f766e] text-[#0f766e]' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `,
    },
  };

  const style = variants[variant] || variants.default;

  return (
    <div className={`${style.container} ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={style.tab(isActive)}
          >
            {tab.icon && <span className="mr-2 inline-block">{tab.icon}</span>}
            {tab.label}
            {tab.badge && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 text-gray-600 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;