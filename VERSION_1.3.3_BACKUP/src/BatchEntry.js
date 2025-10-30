import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parse, isValid } from 'date-fns';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const TAB_TABLE = 'Table';
const TAB_IMPORT = 'Import Spreadsheet';
const TABS = [TAB_TABLE, TAB_IMPORT];

const defaultTableRow = () => ({
  projectName: '',
  description: '',
  deadline: '',
  responsibleParty: '',
  recurring: false, 
  frequency: 'None',
  finalDate: '',
  notes: '',
  documentLink: '',
});

function BatchTaskForm({ addTask }) {
  const [activeTab, setActiveTab] = useState(TAB_TABLE);
  const [tableRows, setTableRows] = useState([defaultTableRow()]);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const [tableMessage, setTableMessage] = useState(null);
  const [tableError, setTableError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const tableHeaders = [
    'Project', 'Description', 'Deadline', 'Responsible (comma-separated)', 'Recurring', 'Interval (months)', 'Final Date', 'Notes', 'Document Link', ''
  ];
  const tableAreaRef = useRef();
  const dropZoneRef = useRef();
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  // Excel-like paste handler for table with cursor position awareness
  const handleTablePaste = (e) => {
    const paste = e.clipboardData.getData('text');
    const lines = paste.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return;

    // Get the currently focused element to determine starting position
    const activeElement = document.activeElement;
    let startRow = 0;
    let startCol = 0;

    // Find the focused cell position
    if (activeElement && activeElement.tagName === 'INPUT') {
      const cell = activeElement.closest('td');
      if (cell) {
        const row = cell.closest('tr');
        const tbody = row.closest('tbody');
        if (tbody) {
          startRow = Array.from(tbody.children).indexOf(row);
          startCol = Array.from(row.children).indexOf(cell);
        }
      }
    }

    // Parse the pasted data using tabs as primary delimiter
    const parseLine = (line) => {
      // Split by tabs first (Excel standard)
      let cells = line.split(/\t/);
      
      // If no tabs found, try comma splitting but be more careful
      if (cells.length === 1) {
        // Only split by comma if the line doesn't contain quoted strings
        if (!line.includes('"')) {
          cells = line.split(/,/);
        }
      }
      
      return cells.map(cell => cell.trim());
    };

    // Parse all lines to get the data structure
    const parsedData = lines.map(line => parseLine(line));
    
    // Find the maximum number of columns in the pasted data
    const maxCols = Math.max(...parsedData.map(row => row.length));
    
    // Map the pasted data to table fields
    const fieldMap = ['projectName', 'description', 'deadline', 'responsibleParty', 'recurring', 'frequency', 'finalDate', 'notes', 'documentLink'];

    // Update table rows starting from the focused position
    setTableRows(rows => {
      const updated = [...rows];
      
      // Ensure we have enough rows
      while (updated.length < startRow + parsedData.length) {
        updated.push(defaultTableRow());
      }

      // Insert the pasted data starting from the focused position
      parsedData.forEach((rowData, rowIndex) => {
        const targetRow = startRow + rowIndex;
        if (targetRow < updated.length) {
          const newRowData = { ...updated[targetRow] };
          
          // Map each column from the pasted data to the appropriate field
          rowData.forEach((cellValue, colIndex) => {
            const targetCol = startCol + colIndex;
            if (targetCol < fieldMap.length) {
              const field = fieldMap[targetCol];
              if (field) {
                newRowData[field] = cellValue;
              }
            }
          });
          
          updated[targetRow] = newRowData;
        }
      });

      return updated;
    });

    e.preventDefault();
  };

  const handleTableChange = (idx, field, value) => {
    setTableRows(rows => rows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };
  
  const handleAddRow = () => setTableRows(rows => [...rows, defaultTableRow()]);
  
  const handleRemoveRow = (idx) => setTableRows(rows => rows.filter((_, i) => i !== idx));
  
  const handleClearTable = () => {
    setTableRows([defaultTableRow()]);
    setTableMessage(null);
    setTableError(null);
  };
  
  // Enhanced input key handler with better paste support
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      handleTableSubmit(e);
    }
    
    // Add visual feedback for paste operations
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      // Add a brief highlight to show paste is ready
      e.target.style.backgroundColor = '#fef3c7';
      setTimeout(() => {
        e.target.style.backgroundColor = '';
      }, 200);
    }
  };
  
  // Handle input focus for better paste positioning
  const handleInputFocus = (e) => {
    // Add visual indicator for focused cell
    e.target.style.backgroundColor = '#dbeafe';
    e.target.style.border = '2px solid #3b82f6';
    e.target.style.boxShadow = '0 0 0 1px #3b82f6';
  };
  
  const handleInputBlur = (e) => {
    // Remove visual indicator
    e.target.style.backgroundColor = '';
    e.target.style.border = '';
    e.target.style.boxShadow = '';
  };

  const handleTableSubmit = (e) => {
    e.preventDefault();
    let added = 0;
    let errorRows = [];
    tableRows.forEach((row, idx) => {
      // Trim all fields
      const projectName = (row.projectName || '').trim();
      const description = (row.description || '').trim();
      const deadline = (row.deadline || '').trim();
      const responsibleParty = (row.responsibleParty || '').trim();
      const frequency = (row.frequency || '').trim();
      const finalDate = (row.finalDate || '').trim();
      const recurringRaw = (row.recurring || '').trim();
      const isRecurring = ['yes', 'r', 'true', 'recurring'].includes(recurringRaw.toLowerCase());
      // Only skip row if all fields are blank
      if (!projectName && !description && !deadline && !responsibleParty && !frequency && !finalDate && !recurringRaw) return;
      // Validate date if present
      let d = null;
      let missingCols = [];
      if (!projectName) missingCols.push('Project');
      if (!description) missingCols.push('Description');
      if (deadline) {
        // Try date-fns formats
        const formats = [
          'yyyy-MM-dd',
          'MM/dd/yyyy',
          'M/d/yy',
          'M/d/yyyy',
          'MM/dd/yy',
        ];
        for (const fmt of formats) {
          const dt = parse(deadline, fmt, new Date());
          if (isValid(dt)) {
            d = dt;
            break;
          }
        }
        // Fallback: try native Date
        if (!d) {
          const dt = new Date(deadline);
          if (!isNaN(dt)) d = dt;
        }
        if (!d || isNaN(d.getTime())) {
          errorRows.push(`Row ${idx + 1}: Invalid date in 'Deadline' column ('${deadline}')`);
          return;
        }
      }
      if (missingCols.length > 0) {
        errorRows.push(`Row ${idx + 1}: Missing ${missingCols.join(', ')}`);
        return;
      }
      addTask({
        projectName,
        description,
        deadline,
        responsibleParty,
        recurring: isRecurring,
        frequency: isRecurring && frequency && !isNaN(parseInt(frequency, 10)) && parseInt(frequency, 10) > 0 ? frequency : 'None',
        finalDate: finalDate || '',
        notes: (row.notes || '').trim(),
        documentLink: (row.documentLink || '').trim(),
        important: false
      });
      added++;
    });
    if (added > 0) {
      setTableMessage(`${added} task${added > 1 ? 's' : ''} imported successfully.`);
      setTableError(null);
      setTimeout(() => setTableMessage(null), 4000);
      // Don't clear the table - let users see their data was added
      // setTableRows([defaultTableRow()]); // Removed this line
    } else if (errorRows.length > 0) {
      setTableError(errorRows.join(' | '));
      setTableMessage(null);
      setTimeout(() => setTableError(null), 8000);
    } else {
      setTableError('No valid tasks to import. Please check your data.');
      setTableMessage(null);
      setTimeout(() => setTableError(null), 4000);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files.find(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ext === 'csv' || ext === 'xlsx' || ext === 'xls';
    });
    
    if (file) {
      processFile(file);
    } else {
      setImportError('Please drop a valid CSV or Excel file');
    }
  };

  const processFile = (file) => {
    setImportError('');
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setImportPreview(results.data);
        },
        error: (err) => setImportError('CSV Parse Error: ' + err.message)
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        setImportPreview(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportError('Unsupported file type. Please upload a CSV or Excel file.');
    }
  };
  const handleImportSubmit = (e) => {
    e.preventDefault();
    let added = 0;
    let skipped = 0;
    
    importPreview.forEach(row => {
      // Only require project and description - make deadline and responsible party optional
      if (!row.projectName || !row.description) {
        skipped++;
        return;
      }
      
      // Parse recurring field properly
      const recurringRaw = (row.recurring || '').toString().toLowerCase().trim();
      const isRecurring = ['yes', 'r', 'true', 'recurring', '1'].includes(recurringRaw);
      
      // Ensure deadline is preserved as-is if it exists
      const deadline = row.deadline || '';
      
      addTask({
        projectName: row.projectName,
        description: row.description,
        deadline: deadline, // Preserve the deadline as-is
        responsibleParty: row.responsibleParty || '',
        recurring: isRecurring,
        frequency: isRecurring ? (row.frequency || 'None') : 'None',
        finalDate: row.finalDate || '',
        notes: row.notes || '',
        documentLink: row.documentLink || '',
        important: false
      });
      added++;
    });
    
    if (added > 0) {
      setImportError('');
      setImportPreview([]);
      alert(`${added} task${added > 1 ? 's' : ''} imported successfully.${skipped > 0 ? ` ${skipped} row${skipped > 1 ? 's' : ''} skipped due to missing required fields.` : ''}`);
    } else {
      alert('No valid tasks to import. Please check that your data has at least Project and Description columns.');
    }
  };

  // File import handler (for the file input)
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-full text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary border ${activeTab === tab ? 'bg-white text-theme-primary border-theme-primary shadow' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
            style={{ minWidth: 140 }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table Tab */}
      {activeTab === TAB_TABLE && (
        <form onSubmit={handleTableSubmit} className="space-y-6">
          <div className="bg-gray-50 rounded-lg shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
                Table Entry
              </h3>
              <div className="flex gap-2">
                <button type="button" onClick={handleAddRow} className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm shadow-sm border border-gray-200">
                  <PlusIcon className="w-5 h-5" /> Add Row
                </button>
                <button type="button" onClick={handleClearTable} className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-medium text-sm shadow-sm border border-red-200 dark:border-red-700">
                  <TrashIcon className="w-4 h-4" /> Clear Table
                </button>
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-2">
              <span className="font-semibold">Excel-like pasting:</span> Click in any cell, then paste (Ctrl+V). 
              Data will start from the selected cell and fill across columns and down rows exactly like Excel. 
              <span className="font-semibold"> Tip:</span> Use tabs to separate columns, commas within cells are preserved.
            </p>
            <div
              ref={tableAreaRef}
              tabIndex={0}
              onPaste={handleTablePaste}
              className="outline-none overflow-x-auto"
            >
              <table className="w-full border border-gray-200 mb-2 text-sm rounded-lg overflow-hidden shadow-sm min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {tableHeaders.map((header, idx) => (
                      <th key={idx} className="border-b border-gray-200 font-bold px-2 py-2 text-center text-gray-700 uppercase tracking-wide text-xs whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td><input type="text" value={row.projectName} onChange={e => handleTableChange(idx, 'projectName', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Project" /></td>
                      <td><input type="text" value={row.description} onChange={e => handleTableChange(idx, 'description', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Description" /></td>
                      <td><input type="text" value={row.deadline} onChange={e => handleTableChange(idx, 'deadline', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Enter date" /></td>
                      <td><input type="text" value={row.responsibleParty} onChange={e => handleTableChange(idx, 'responsibleParty', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Name1, Name2" /></td>
                      <td className="text-center"><input type="text" value={row.recurring} onChange={e => handleTableChange(idx, 'recurring', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Yes/R/True/Recurring" /></td>
                      <td><input type="text" value={row.frequency} onChange={e => handleTableChange(idx, 'frequency', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="e.g. 1, 3, 6, 12" /></td>
                      <td><input type="text" value={row.finalDate} onChange={e => handleTableChange(idx, 'finalDate', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Final Date" /></td>
                      <td><input type="text" value={row.notes} onChange={e => handleTableChange(idx, 'notes', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Notes" /></td>
                      <td><input type="text" value={row.documentLink} onChange={e => handleTableChange(idx, 'documentLink', e.target.value)} className="border-none px-2 py-2 w-full bg-transparent text-center focus:outline-none text-xs" onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder="Document link" /></td>
                      <td className="text-center">
                        <button type="button" onClick={() => handleRemoveRow(idx)} className="text-gray-400 hover:text-red-500 p-1 rounded-full focus:outline-none" title="Remove Row">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-theme-primary text-white px-6 py-2 rounded-lg hover:bg-theme-primary-hover font-semibold transition-colors duration-200 shadow-md hover:shadow-lg">Add Batch Tasks</button>
            </div>
            {tableMessage && <div className="text-gray-700 font-semibold mt-2">{tableMessage}</div>}
            {tableError && <div className="text-gray-600 font-semibold mt-2">{tableError}</div>}
          </div>
        </form>
      )}

      {/* Import Spreadsheet Tab */}
      {activeTab === TAB_IMPORT && (
        <form onSubmit={handleImportSubmit} className="space-y-6">
          <div className="bg-gray-50 rounded-lg shadow-sm p-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
              Import Spreadsheet
            </h3>
            <p className="text-gray-500 text-sm mb-4">Upload a CSV or Excel file. Columns will be matched by header name.</p>
            
            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                isDragOver 
                  ? 'border-theme-primary bg-theme-primary-light' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <svg className={`w-12 h-12 ${isDragOver ? 'text-theme-primary' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    {isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse
                  </p>
                </div>
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                  onChange={handleFileImport} 
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload"
                  className="cursor-pointer bg-theme-primary text-white px-4 py-2 rounded-lg hover:bg-theme-primary-hover transition-colors"
                >
                  Choose File
                </label>
              </div>
            </div>
            
            {importError && <div className="text-red-600 mt-4 p-3 bg-red-50 rounded-lg">{importError}</div>}
            {importPreview.length > 0 && (
              <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {Object.keys(importPreview[0]).map((col, idx) => <th key={idx} className="px-4 py-2 text-left font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {Object.values(row).map((val, i) => <td key={i} className="border-b border-gray-100 px-4 py-2">{val}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {importPreview.length > 0 && (
              <div className="flex justify-end">
                <button type="submit" className="bg-theme-primary text-white px-6 py-2 rounded-lg hover:bg-theme-primary-hover font-semibold transition-colors duration-200 shadow-md hover:shadow-lg">Import Tasks</button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default BatchTaskForm;