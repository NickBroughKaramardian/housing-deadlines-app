import React, { useState } from 'react';

function TaskForm({ addTask }) {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [responsibleParty, setResponsibleParty] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState('None');
  const [finalDate, setFinalDate] = useState('');
  const [notes, setNotes] = useState('');
  const [documentLink, setDocumentLink] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!projectName || !deadline) return;

    let freq = recurring ? frequency : 'None';
    if (recurring && (!frequency || isNaN(parseInt(frequency, 10)) || parseInt(frequency, 10) < 1)) {
      alert('Please enter a valid interval in months (e.g., 1, 3, 6, 12)');
      return;
    }

    const task = {
      projectName,
      description,
      deadline,
      responsibleParty,
      recurring,
      frequency: freq,
      finalDate,
      notes,
      documentLink: documentLink,
      important: false
    };
    addTask(task);
    setProjectName('');
    setDescription('');
    setDeadline('');
    setResponsibleParty('');
    setRecurring(false);
    setFrequency('None');
    setFinalDate('');
    setNotes('');
    setDocumentLink('');
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-8 mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg className="w-7 h-7 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Add Single Task
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          type="text"
          placeholder="Project Name"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-gray-800"
        />
        <input
          type="text"
          placeholder="Task Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-gray-800"
        />
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-gray-800"
        />
        <input
          type="text"
          placeholder="Responsible Party (use commas to separate multiple parties)"
          value={responsibleParty}
          onChange={e => setResponsibleParty(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-gray-800"
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows="3"
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-gray-800 resize-none"
        />
        <input
          type="text"
          placeholder="Document Link (optional) - SharePoint, OneDrive, web link, or file path"
          value={documentLink}
          onChange={e => setDocumentLink(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-gray-800"
        />
        <div className="flex items-center gap-4 mb-2">
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={recurring}
              onChange={e => setRecurring(e.target.checked)}
              id="recurring"
              className="rounded focus:ring-2 focus:ring-theme-primary"
            />
            Recurring?
          </label>
        </div>
        {recurring && (
          <div className="flex gap-4">
            <label className="flex flex-col flex-1">
              <span className="text-gray-700 font-medium mb-1">Interval (months)</span>
              <input
                type="number"
                min="1"
                value={frequency === 'None' ? '' : frequency}
                onChange={e => setFrequency(e.target.value)}
                placeholder="e.g. 1 for monthly, 6 for biannual, 12 for yearly"
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-gray-800 w-full"
              />
            </label>
            <label className="flex flex-col flex-1">
              <span className="text-gray-700 font-medium mb-1">Final Date</span>
              <input
                type="date"
                value={finalDate}
                onChange={e => setFinalDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent text-gray-800 w-full"
                min={deadline}
              />
            </label>
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-theme-primary text-white px-6 py-3 rounded-lg hover:bg-theme-primary-hover transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary text-lg font-semibold shadow-md hover:shadow-lg"
        >
          <span className="flex items-center gap-2 justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Task
          </span>
        </button>
      </form>
    </div>
  );
}

export default TaskForm;
