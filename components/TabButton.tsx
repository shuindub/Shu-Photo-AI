
import React from 'react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  isLoading?: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, icon, isLoading }) => {
  const baseClasses = "flex items-center justify-center space-x-2 w-full px-4 py-2.5 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 border";
  const activeClasses = "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-lg border-gray-200 dark:border-indigo-500 ring-1 ring-black/5 dark:ring-0";
  const inactiveClasses = "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-transparent";
  
  // Light indicator classes
  const lightBaseClasses = "w-2 h-2 rounded-full transition-all duration-300";
  const lightActiveClasses = "bg-green-500 dark:bg-green-400 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.7)]";
  const lightInactiveClasses = "bg-gray-400 dark:bg-gray-500";

  const renderLabel = (text: string) => {
    return text.split(/([2&])/).map((part, index) => {
      if (part === '2' || part === '&') {
        return <span key={index} className="text-pink-500 font-bold">{part}</span>;
      }
      return part;
    });
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
      <div className={isActive ? "text-indigo-600 dark:text-white" : "text-gray-500 dark:text-gray-400"}>
        {icon}
      </div>
      <span className="hidden sm:inline">{renderLabel(label)}</span>
      <span className={`${lightBaseClasses} ${isLoading ? lightActiveClasses : lightInactiveClasses}`} />
    </button>
  );
};

export default TabButton;
