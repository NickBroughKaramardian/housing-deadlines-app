var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import * as React from 'react';
import { SharePointService } from '../../../services/SharePointService';
import { parse, isValid } from 'date-fns';
var CcProjectManager = /** @class */ (function (_super) {
    __extends(CcProjectManager, _super);
    function CcProjectManager(props) {
        var _this = _super.call(this, props) || this;
        _this.handleAddTask = function (newTask) { return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.sharePointService.addTask(newTask)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.loadData()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Error adding task:', error_1);
                        this.setState({ error: 'Failed to add task' });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        _this.handleDeleteTask = function (taskId) { return __awaiter(_this, void 0, void 0, function () {
            var _a, parentId_1, date_1, existing, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 9, , 10]);
                        if (!taskId.includes('_')) return [3 /*break*/, 5];
                        _a = taskId.split('_'), parentId_1 = _a[0], date_1 = _a[1];
                        existing = this.state.overrides.find(function (o) { return o.parentId === parentId_1 && o.deadline === date_1; });
                        if (!existing) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.sharePointService.updateTaskOverride(existing.id, { deleted: true })];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.sharePointService.addTaskOverride({
                            parentId: parentId_1,
                            deadline: date_1,
                            deleted: true
                        })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, this.sharePointService.deleteTask(taskId)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [4 /*yield*/, this.loadData()];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        error_2 = _b.sent();
                        console.error('Error deleting task:', error_2);
                        this.setState({ error: 'Failed to delete task' });
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        }); };
        _this.handleToggleCompleted = function (taskId) { return __awaiter(_this, void 0, void 0, function () {
            var _a, parentId_2, date_2, existing, parentTask, currentCompleted, task, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 9, , 10]);
                        if (!taskId.includes('_')) return [3 /*break*/, 5];
                        _a = taskId.split('_'), parentId_2 = _a[0], date_2 = _a[1];
                        existing = this.state.overrides.find(function (o) { return o.parentId === parentId_2 && o.deadline === date_2; });
                        parentTask = this.state.tasks.find(function (t) { return t.id === parentId_2; });
                        currentCompleted = existing ? existing.completed : ((parentTask === null || parentTask === void 0 ? void 0 : parentTask.completed) || false);
                        if (!existing) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.sharePointService.updateTaskOverride(existing.id, { completed: !currentCompleted })];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.sharePointService.addTaskOverride({
                            parentId: parentId_2,
                            deadline: date_2,
                            completed: !currentCompleted
                        })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        task = this.state.tasks.find(function (t) { return t.id === taskId; });
                        if (!task) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.sharePointService.updateTask(taskId, { completed: !task.completed })];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [4 /*yield*/, this.loadData()];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        error_3 = _b.sent();
                        console.error('Error toggling completed:', error_3);
                        this.setState({ error: 'Failed to update task' });
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        }); };
        _this.handleToggleUrgent = function (taskId) { return __awaiter(_this, void 0, void 0, function () {
            var _a, parentId_3, date_3, existing, parentTask, currentImportant, task, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 9, , 10]);
                        if (!taskId.includes('_')) return [3 /*break*/, 5];
                        _a = taskId.split('_'), parentId_3 = _a[0], date_3 = _a[1];
                        existing = this.state.overrides.find(function (o) { return o.parentId === parentId_3 && o.deadline === date_3; });
                        parentTask = this.state.tasks.find(function (t) { return t.id === parentId_3; });
                        currentImportant = existing ? existing.important : ((parentTask === null || parentTask === void 0 ? void 0 : parentTask.important) || false);
                        if (!existing) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.sharePointService.updateTaskOverride(existing.id, { important: !currentImportant })];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.sharePointService.addTaskOverride({
                            parentId: parentId_3,
                            deadline: date_3,
                            important: !currentImportant
                        })];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        task = this.state.tasks.find(function (t) { return t.id === taskId; });
                        if (!task) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.sharePointService.updateTask(taskId, { important: !task.important })];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7: return [4 /*yield*/, this.loadData()];
                    case 8:
                        _b.sent();
                        return [3 /*break*/, 10];
                    case 9:
                        error_4 = _b.sent();
                        console.error('Error toggling urgent:', error_4);
                        this.setState({ error: 'Failed to update task' });
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        }); };
        _this.sharePointService = new SharePointService(props.context);
        _this.state = {
            tasks: [],
            overrides: [],
            activeTab: 'dashboard',
            sortOption: '',
            filterValue: '',
            filterYear: '',
            filterMonth: '',
            filterDay: '',
            showIncompleteOnly: false,
            loading: true,
            error: null
        };
        return _this;
    }
    CcProjectManager.prototype.componentDidMount = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        // Initialize SharePoint lists
                        return [4 /*yield*/, this.sharePointService.initializeLists()];
                    case 1:
                        // Initialize SharePoint lists
                        _a.sent();
                        // Load data
                        return [4 /*yield*/, this.loadData()];
                    case 2:
                        // Load data
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        console.error('Error initializing component:', error_5);
                        this.setState({ error: 'Failed to initialize application', loading: false });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CcProjectManager.prototype.loadData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, tasks, overrides, error_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, Promise.all([
                                this.sharePointService.getTasks(),
                                this.sharePointService.getTaskOverrides()
                            ])];
                    case 1:
                        _a = _b.sent(), tasks = _a[0], overrides = _a[1];
                        this.setState({
                            tasks: tasks,
                            overrides: overrides,
                            loading: false
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _b.sent();
                        console.error('Error loading data:', error_6);
                        this.setState({ error: 'Failed to load data', loading: false });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    CcProjectManager.prototype.parseDeadlineDate = function (dateStr) {
        if (!dateStr)
            return null;
        var formats = [
            'yyyy-MM-dd',
            'MM/dd/yyyy',
            'M/d/yy',
            'M/d/yyyy',
            'MM/dd/yy',
        ];
        for (var _i = 0, formats_1 = formats; _i < formats_1.length; _i++) {
            var fmt = formats_1[_i];
            var d = parse(dateStr, fmt, new Date());
            if (isValid(d))
                return d;
        }
        return null;
    };
    CcProjectManager.prototype.expandRecurringTasks = function (tasks) {
        var _this = this;
        var allOccurrences = [];
        var defaultYears = 50;
        tasks.forEach(function (task) {
            if (task.recurring && task.frequency && task.deadline) {
                var interval = parseInt(task.frequency, 10);
                if (isNaN(interval) || interval < 1) {
                    allOccurrences.push(__assign(__assign({}, task), { id: task.id }));
                    return;
                }
                var startDate = _this.parseDeadlineDate(task.deadline);
                if (!startDate) {
                    allOccurrences.push(__assign(__assign({}, task), { id: task.id }));
                    return;
                }
                var endYear = parseInt(task.finalYear || '', 10);
                var defaultEndYear = startDate.getFullYear() + defaultYears;
                if (isNaN(endYear) || endYear > defaultEndYear) {
                    endYear = defaultEndYear;
                }
                var current = new Date(startDate);
                var _loop_1 = function () {
                    var instanceDate = new Date(current);
                    if (instanceDate.getMonth() !== current.getMonth()) {
                        instanceDate.setDate(0);
                    }
                    if (instanceDate.getFullYear() > endYear)
                        return "break";
                    var instanceDeadline = instanceDate.toISOString().split('T')[0];
                    var override = _this.state.overrides.find(function (o) { return o.parentId === task.id && o.deadline === instanceDeadline; });
                    if (override) {
                        if (!override.deleted) {
                            allOccurrences.push(__assign(__assign(__assign({}, task), override), { completed: override.completed !== undefined ? override.completed : task.completed, important: override.important !== undefined ? override.important : task.important, id: "".concat(task.id, "_").concat(instanceDeadline), deadline: instanceDeadline, recurring: false }));
                        }
                    }
                    else {
                        allOccurrences.push(__assign(__assign({}, task), { id: "".concat(task.id, "_").concat(instanceDeadline), deadline: instanceDeadline, recurring: false, important: task.important || false, completed: task.completed || false }));
                    }
                    current.setMonth(current.getMonth() + interval);
                };
                while (current.getFullYear() <= endYear) {
                    var state_1 = _loop_1();
                    if (state_1 === "break")
                        break;
                }
            }
            else {
                allOccurrences.push(__assign(__assign({}, task), { id: task.id }));
            }
        });
        return allOccurrences;
    };
    CcProjectManager.prototype.getFilteredSortedTasks = function () {
        var _this = this;
        var expandedTasks = this.expandRecurringTasks(this.state.tasks);
        var filtered = __spreadArray([], expandedTasks, true);
        // Apply filters
        if (this.state.sortOption === 'Deadline') {
            if (this.state.filterYear.trim()) {
                filtered = filtered.filter(function (task) {
                    var d = _this.parseDeadlineDate(task.deadline);
                    if (!d)
                        return false;
                    return d.getFullYear().toString() === _this.state.filterYear.trim();
                });
            }
            if (this.state.filterMonth.trim()) {
                var monthNames = {
                    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
                    'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7, 'aug': 8, 'august': 8,
                    'sep': 9, 'sept': 9, 'september': 9, 'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
                };
                var lowerFilterMonth = this.state.filterMonth.trim().toLowerCase();
                var monthToFilter_1 = monthNames[lowerFilterMonth];
                if (!monthToFilter_1) {
                    var parsedMonth = parseInt(lowerFilterMonth, 10);
                    if (!isNaN(parsedMonth) && parsedMonth > 0 && parsedMonth < 13) {
                        monthToFilter_1 = parsedMonth;
                    }
                }
                if (monthToFilter_1) {
                    filtered = filtered.filter(function (task) {
                        var d = _this.parseDeadlineDate(task.deadline);
                        if (!d)
                            return false;
                        return d.getMonth() + 1 === monthToFilter_1;
                    });
                }
            }
            if (this.state.filterDay.trim()) {
                var dayToFilter_1 = parseInt(this.state.filterDay.trim(), 10);
                if (!isNaN(dayToFilter_1)) {
                    filtered = filtered.filter(function (task) {
                        var d = _this.parseDeadlineDate(task.deadline);
                        if (!d)
                            return false;
                        return d.getDate() === dayToFilter_1;
                    });
                }
            }
        }
        else if (this.state.sortOption === 'Responsible Party') {
            filtered = filtered.filter(function (task) {
                if (!task.responsibleParty || !_this.state.filterValue)
                    return false;
                var taskParties = task.responsibleParty.toLowerCase().split(',').map(function (p) { return p.trim(); });
                var filterParty = _this.state.filterValue.toLowerCase().trim();
                return taskParties.some(function (party) { return party === filterParty; });
            });
        }
        else if (this.state.sortOption === 'Project') {
            filtered = filtered.filter(function (task) { var _a; return ((_a = task.projectName) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === _this.state.filterValue.toLowerCase(); });
        }
        else if (this.state.sortOption === 'Search') {
            var searchTerm_1 = this.state.filterValue.toLowerCase();
            filtered = filtered.filter(function (task) {
                var _a, _b, _c;
                var projectMatch = (_a = task.projectName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchTerm_1);
                var descriptionMatch = (_b = task.description) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchTerm_1);
                var responsibleMatch = (_c = task.responsibleParty) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchTerm_1);
                return projectMatch || descriptionMatch || responsibleMatch;
            });
        }
        // Filter incomplete tasks
        if (this.state.showIncompleteOnly) {
            filtered = filtered.filter(function (task) { return !task.completed; });
        }
        // Sort by deadline
        filtered.sort(function (a, b) {
            var da = _this.parseDeadlineDate(a.deadline);
            var db = _this.parseDeadlineDate(b.deadline);
            var ta = da instanceof Date && !isNaN(da.getTime()) ? da.getTime() : Infinity;
            var tb = db instanceof Date && !isNaN(db.getTime()) ? db.getTime() : Infinity;
            return ta - tb;
        });
        return filtered;
    };
    CcProjectManager.prototype.render = function () {
        var _this = this;
        var _a = this.state, loading = _a.loading, error = _a.error;
        if (loading) {
            return (React.createElement("div", { className: "cc-project-manager" },
                React.createElement("div", { className: "loading" }, "Loading C&C Project Manager...")));
        }
        if (error) {
            return (React.createElement("div", { className: "cc-project-manager" },
                React.createElement("div", { className: "error" },
                    "Error: ",
                    error)));
        }
        var filteredTasks = this.getFilteredSortedTasks();
        return (React.createElement("div", { className: "cc-project-manager" },
            React.createElement("div", { className: "header" },
                React.createElement("h1", null, "C&C Project Manager"),
                React.createElement("p", null, this.props.description)),
            React.createElement("div", { className: "navigation" },
                React.createElement("button", { className: this.state.activeTab === 'dashboard' ? 'active' : '', onClick: function () { return _this.setState({ activeTab: 'dashboard' }); } }, "Dashboard"),
                React.createElement("button", { className: this.state.activeTab === 'tasks' ? 'active' : '', onClick: function () { return _this.setState({ activeTab: 'tasks' }); } }, "Tasks"),
                React.createElement("button", { className: this.state.activeTab === 'add' ? 'active' : '', onClick: function () { return _this.setState({ activeTab: 'add' }); } }, "Add Task")),
            React.createElement("div", { className: "content" },
                this.state.activeTab === 'dashboard' && (React.createElement("div", { className: "dashboard" },
                    React.createElement("h2", null, "Dashboard"),
                    React.createElement("div", { className: "stats" },
                        React.createElement("div", { className: "stat" },
                            React.createElement("h3", null, "Total Tasks"),
                            React.createElement("p", null, this.state.tasks.length)),
                        React.createElement("div", { className: "stat" },
                            React.createElement("h3", null, "Completed"),
                            React.createElement("p", null, this.state.tasks.filter(function (t) { return t.completed; }).length)),
                        React.createElement("div", { className: "stat" },
                            React.createElement("h3", null, "Urgent"),
                            React.createElement("p", null, this.state.tasks.filter(function (t) { return t.important; }).length))))),
                this.state.activeTab === 'tasks' && (React.createElement("div", { className: "tasks" },
                    React.createElement("div", { className: "filters" },
                        React.createElement("select", { value: this.state.sortOption, onChange: function (e) { return _this.setState({ sortOption: e.target.value }); } },
                            React.createElement("option", { value: "" }, "Sort by..."),
                            React.createElement("option", { value: "Deadline" }, "Deadline"),
                            React.createElement("option", { value: "Responsible Party" }, "Responsible Party"),
                            React.createElement("option", { value: "Project" }, "Project"),
                            React.createElement("option", { value: "Search" }, "Search")),
                        this.state.sortOption === 'Deadline' && (React.createElement("div", { className: "date-filters" },
                            React.createElement("input", { type: "text", placeholder: "Year", value: this.state.filterYear, onChange: function (e) { return _this.setState({ filterYear: e.target.value }); } }),
                            React.createElement("input", { type: "text", placeholder: "Month", value: this.state.filterMonth, onChange: function (e) { return _this.setState({ filterMonth: e.target.value }); } }),
                            React.createElement("input", { type: "text", placeholder: "Day", value: this.state.filterDay, onChange: function (e) { return _this.setState({ filterDay: e.target.value }); } }))),
                        this.state.sortOption === 'Search' && (React.createElement("input", { type: "text", placeholder: "Search tasks...", value: this.state.filterValue, onChange: function (e) { return _this.setState({ filterValue: e.target.value }); } })),
                        React.createElement("label", null,
                            React.createElement("input", { type: "checkbox", checked: this.state.showIncompleteOnly, onChange: function (e) { return _this.setState({ showIncompleteOnly: e.target.checked }); } }),
                            "Incomplete only")),
                    React.createElement("div", { className: "task-list" }, filteredTasks.map(function (task) { return (React.createElement("div", { key: task.id, className: "task-card ".concat(task.completed ? 'completed' : '', " ").concat(task.important ? 'urgent' : '') },
                        React.createElement("div", { className: "task-header" },
                            React.createElement("h3", null, task.description),
                            React.createElement("div", { className: "task-actions" },
                                React.createElement("button", { onClick: function () { return _this.handleToggleCompleted(task.id); } }, task.completed ? '✓' : '○'),
                                React.createElement("button", { onClick: function () { return _this.handleToggleUrgent(task.id); } }, task.important ? '⚠' : '○'),
                                React.createElement("button", { onClick: function () { return _this.handleDeleteTask(task.id); } }, "\uD83D\uDDD1"))),
                        React.createElement("div", { className: "task-details" },
                            React.createElement("p", null,
                                React.createElement("strong", null, "Project:"),
                                " ",
                                task.projectName),
                            React.createElement("p", null,
                                React.createElement("strong", null, "Responsible:"),
                                " ",
                                task.responsibleParty),
                            React.createElement("p", null,
                                React.createElement("strong", null, "Deadline:"),
                                " ",
                                task.deadline),
                            task.notes && React.createElement("p", null,
                                React.createElement("strong", null, "Notes:"),
                                " ",
                                task.notes)))); })))),
                this.state.activeTab === 'add' && (React.createElement("div", { className: "add-task" },
                    React.createElement("h2", null, "Add New Task"),
                    React.createElement(TaskForm, { onSubmit: this.handleAddTask }))))));
    };
    return CcProjectManager;
}(React.Component));
export { CcProjectManager };
var TaskForm = /** @class */ (function (_super) {
    __extends(TaskForm, _super);
    function TaskForm(props) {
        var _this = _super.call(this, props) || this;
        _this.handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        e.preventDefault();
                        return [4 /*yield*/, this.props.onSubmit(this.state)];
                    case 1:
                        _a.sent();
                        this.setState({
                            projectName: '',
                            description: '',
                            deadline: '',
                            responsibleParty: '',
                            recurring: false,
                            frequency: '',
                            finalYear: '',
                            important: false,
                            completed: false,
                            notes: ''
                        });
                        return [2 /*return*/];
                }
            });
        }); };
        _this.state = {
            projectName: '',
            description: '',
            deadline: '',
            responsibleParty: '',
            recurring: false,
            frequency: '',
            finalYear: '',
            important: false,
            completed: false,
            notes: ''
        };
        return _this;
    }
    TaskForm.prototype.render = function () {
        var _this = this;
        return (React.createElement("form", { onSubmit: this.handleSubmit },
            React.createElement("div", null,
                React.createElement("label", null, "Project Name:"),
                React.createElement("input", { type: "text", value: this.state.projectName, onChange: function (e) { return _this.setState({ projectName: e.target.value }); }, required: true })),
            React.createElement("div", null,
                React.createElement("label", null, "Description:"),
                React.createElement("input", { type: "text", value: this.state.description, onChange: function (e) { return _this.setState({ description: e.target.value }); }, required: true })),
            React.createElement("div", null,
                React.createElement("label", null, "Deadline:"),
                React.createElement("input", { type: "date", value: this.state.deadline, onChange: function (e) { return _this.setState({ deadline: e.target.value }); }, required: true })),
            React.createElement("div", null,
                React.createElement("label", null, "Responsible Party:"),
                React.createElement("input", { type: "text", value: this.state.responsibleParty, onChange: function (e) { return _this.setState({ responsibleParty: e.target.value }); }, required: true })),
            React.createElement("div", null,
                React.createElement("label", null,
                    React.createElement("input", { type: "checkbox", checked: this.state.recurring, onChange: function (e) { return _this.setState({ recurring: e.target.checked }); } }),
                    "Recurring")),
            this.state.recurring && (React.createElement(React.Fragment, null,
                React.createElement("div", null,
                    React.createElement("label", null, "Frequency (months):"),
                    React.createElement("input", { type: "number", value: this.state.frequency, onChange: function (e) { return _this.setState({ frequency: e.target.value }); }, min: "1" })),
                React.createElement("div", null,
                    React.createElement("label", null, "Final Year:"),
                    React.createElement("input", { type: "number", value: this.state.finalYear, onChange: function (e) { return _this.setState({ finalYear: e.target.value }); }, min: new Date().getFullYear() })))),
            React.createElement("div", null,
                React.createElement("label", null,
                    React.createElement("input", { type: "checkbox", checked: this.state.important, onChange: function (e) { return _this.setState({ important: e.target.checked }); } }),
                    "Urgent")),
            React.createElement("div", null,
                React.createElement("label", null, "Notes:"),
                React.createElement("textarea", { value: this.state.notes, onChange: function (e) { return _this.setState({ notes: e.target.value }); } })),
            React.createElement("button", { type: "submit" }, "Add Task")));
    };
    return TaskForm;
}(React.Component));
//# sourceMappingURL=CcProjectManager.js.map