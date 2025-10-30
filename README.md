# Housing Deadlines App

A comprehensive project management application for handling housing-related deadlines and tasks with advanced recurring task support.

## Features

### Core Functionality
- **Task Management**: Add, edit, delete, and mark tasks as urgent
- **Batch Entry**: Import multiple tasks via table entry or spreadsheet upload (CSV/XLSX)
- **Advanced Sorting & Filtering**: Sort by deadline, responsible party, project, recurring status, urgent status, or search across multiple fields
- **Dashboard**: Overview of this week's deadlines and interactive notes board

### Recurring Tasks (NEW!)
The app now features **intelligent recurring task expansion** that automatically generates all individual instances of recurring deadlines:

- **Automatic Expansion**: Recurring tasks are automatically expanded into all their individual instances
- **Multiple Frequencies**: Supports Monthly, Quarterly, Biannually, and Yearly recurring patterns
- **Year Range Support**: Specify a final year to generate instances across multiple years
- **Smart Date Handling**: Automatically handles month overflow (e.g., 31st day in months with 30 days)
- **Individual Instance Management**: Each expanded instance can be individually marked as urgent or deleted
- **Search & Filter Integration**: All expanded instances appear in search results and filters

#### Example
If you create a monthly recurring task from 2024-2026:
- **Original Task**: "Monthly Report" due 2024-01-15, recurring monthly until 2026
- **Expanded Instances**: 36 individual tasks (12 per year × 3 years)
- **Search Results**: Searching for "2025" will show all 12 instances for that year
- **Dashboard**: Each instance appears separately in "Deadlines This Week" when applicable

### Batch Import Features
- **Table Entry**: Excel-like table interface with paste support
- **Spreadsheet Import**: Direct CSV/XLSX file upload with automatic column mapping
- **Validation**: Comprehensive error checking with detailed feedback
- **Flexible Input**: Accepts various date formats and recurring task indicators

### UI/UX Features
- **Modern Design**: Clean, minimalistic interface with Tailwind CSS
- **Color-Coded Deadlines**: Visual indicators for urgency (red/yellow/green)
- **Responsive Layout**: Works on desktop and mobile devices
- **Accessibility**: Keyboard navigation and screen reader support

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm start
   ```

3. **Open Browser**: Navigate to `http://localhost:3000`

## Usage

### Adding Tasks
1. Navigate to "Add Tasks" tab
2. Choose between single task entry or batch entry
3. For batch entry, use table mode or upload a spreadsheet
4. Set recurring options if needed (frequency and final year)

### Managing Recurring Tasks
1. **Create**: Set recurring = true, choose frequency, specify final year
2. **View**: All instances automatically appear in the task list
3. **Filter**: Use "Recurring" filter to see only recurring tasks
4. **Search**: Search by year to see all instances for that period
5. **Edit**: Edit the original task to update all instances
6. **Delete**: Delete individual instances or the original to remove all

### Sorting & Filtering
- **Deadline**: Filter by year, month, and/or day
- **Responsible Party**: Filter by specific person/team
- **Project**: Filter by project name
- **Recurring**: Show only recurring or non-recurring tasks
- **Urgent**: Show only urgent tasks
- **Search**: Search across project, description, responsible party, and frequency

## Data Storage
All data is stored locally in the browser's localStorage, ensuring privacy and offline access.

## Technologies Used
- React 18
- Tailwind CSS
- date-fns (date manipulation)
- Papa Parse (CSV parsing)
- SheetJS (Excel file parsing)
- Heroicons (UI icons)
ci: trigger
