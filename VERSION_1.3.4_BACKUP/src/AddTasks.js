import React, { useState } from 'react';
import TaskForm from './TaskForm';
import BatchTaskForm from './BatchEntry';

const TABS = ['Single Entry', 'Batch Entry'];

function AddTasks({ addTask }) {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md p-4 lg:p-8 mt-4 lg:mt-6">
      <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-4 lg:mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 lg:w-7 lg:h-7 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Add Tasks
      </h2>
      <div className="flex w-full justify-center gap-2 mb-6 lg:mb-8">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[100px] lg:min-w-[120px] px-3 lg:px-6 py-2 rounded-full text-sm lg:text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary border text-center ${activeTab === tab ? 'bg-white text-theme-primary border-theme-primary shadow' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
            style={{ minWidth: 'auto' }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div>
        {activeTab === 'Single Entry' && <TaskForm addTask={addTask} />}
        {activeTab === 'Batch Entry' && <BatchTaskForm addTask={addTask} />}
      </div>
    </div>
  );
}

export default AddTasks; 