// Selection state machine for the Database table (A1).
// Supports macOS-like selection: click replaces, ctrl/cmd toggles,
// shift+click selects a range from a fixed anchor. Recurring template
// headers select/deselect their instances.

import { useState, useMemo, useCallback } from 'react';

export function useTaskSelection({ getVisibleTasksInOrder, recurringTemplates, instances, selectableIds }) {
  const [selectedTasks, setSelectedTasks] = useState([]);
  // Anchor for shift+click range selection; only changes on regular clicks
  const [anchorTaskId, setAnchorTaskId] = useState(null);

  const selectedTaskIds = useMemo(() => new Set(selectedTasks), [selectedTasks]);

  const selectAll = useCallback(() => {
    setSelectedTasks(Array.from(selectableIds));
    setAnchorTaskId(null);
  }, [selectableIds]);

  const clearSelection = useCallback(() => {
    setSelectedTasks([]);
  }, []);

  const handleTaskSelection = useCallback((taskId, event = null) => {
    const isTemplate = recurringTemplates.find(t => t.id === taskId);
    const wasSelected = selectedTasks.includes(taskId);

    // Shift+click range selection from the anchor
    if (event?.shiftKey && anchorTaskId) {
      if (anchorTaskId === taskId) {
        setSelectedTasks([anchorTaskId]);
        return;
      }

      const allVisibleTasks = getVisibleTasksInOrder();
      const anchorIndex = allVisibleTasks.findIndex(t => t.id === anchorTaskId);
      const currentIndex = allVisibleTasks.findIndex(t => t.id === taskId);

      if (anchorIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(anchorIndex, currentIndex);
        const endIndex = Math.max(anchorIndex, currentIndex);
        const rangeTaskIds = allVisibleTasks
          .slice(startIndex, endIndex + 1)
          .map(t => t.id);

        // Expand any template IDs in the range to include all their instances
        const expandedRangeTaskIds = [...rangeTaskIds];
        rangeTaskIds.forEach(rangeId => {
          if (recurringTemplates.find(t => t.id === rangeId)) {
            instances
              .filter(inst => inst.templateId === rangeId)
              .forEach(inst => expandedRangeTaskIds.push(inst.id));
          }
        });

        setSelectedTasks([...new Set(expandedRangeTaskIds)]);
        // Anchor stays fixed on shift+click
        return;
      }
    }

    // Shift+click with no anchor yet: treat as regular click to set anchor
    if (event?.shiftKey && !anchorTaskId) {
      setAnchorTaskId(taskId);
      if (isTemplate) {
        const templateInstances = instances
          .filter(inst => inst.templateId === taskId)
          .map(inst => inst.id);
        setSelectedTasks([taskId, ...templateInstances]);
      } else {
        setSelectedTasks([taskId]);
      }
      return;
    }

    // Template header being checked: also select its instances
    if (isTemplate && !wasSelected) {
      const templateInstances = instances
        .filter(inst => inst.templateId === taskId)
        .map(inst => inst.id);

      const isCtrlOrCmd = event?.ctrlKey || event?.metaKey;
      if (!isCtrlOrCmd) {
        setSelectedTasks([taskId, ...templateInstances]);
      } else {
        setSelectedTasks(prev => [...new Set([...prev, taskId, ...templateInstances])]);
      }
      setAnchorTaskId(taskId);
      return;
    }

    // Template header being unchecked: also deselect its instances
    if (isTemplate && wasSelected) {
      const templateInstances = instances
        .filter(inst => inst.templateId === taskId)
        .map(inst => inst.id);
      setSelectedTasks(prev => prev.filter(id => id !== taskId && !templateInstances.includes(id)));
      setAnchorTaskId(null);
      return;
    }

    const isCtrlOrCmd = event?.ctrlKey || event?.metaKey;
    if (!isCtrlOrCmd) {
      // Normal click: replace selection with just this item (toggle off if it
      // was the only selected item)
      setSelectedTasks(prev => (prev.length === 1 && prev[0] === taskId) ? [] : [taskId]);
      setAnchorTaskId(taskId);
    } else {
      // Ctrl/Cmd+click: toggle individual item
      setSelectedTasks(prev => prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]);
      setAnchorTaskId(taskId);
    }
  }, [anchorTaskId, getVisibleTasksInOrder, recurringTemplates, instances, selectedTasks]);

  return {
    selectedTasks,
    setSelectedTasks,
    selectedTaskIds,
    handleTaskSelection,
    selectAll,
    clearSelection
  };
}
