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
import { SPHttpClient } from '@microsoft/sp-http';
var SharePointService = /** @class */ (function () {
    function SharePointService(context) {
        this.context = context;
    }
    // Initialize SharePoint lists for data storage
    SharePointService.prototype.initializeLists = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        // Create Project Tasks list
                        return [4 /*yield*/, this.createList('Project Tasks', [
                                { Title: 'ProjectName', FieldTypeKind: 1 },
                                { Title: 'Description', FieldTypeKind: 1 },
                                { Title: 'Deadline', FieldTypeKind: 4 },
                                { Title: 'ResponsibleParty', FieldTypeKind: 1 },
                                { Title: 'Recurring', FieldTypeKind: 8 },
                                { Title: 'Frequency', FieldTypeKind: 1 },
                                { Title: 'FinalYear', FieldTypeKind: 1 },
                                { Title: 'Important', FieldTypeKind: 8 },
                                { Title: 'Completed', FieldTypeKind: 8 },
                                { Title: 'Notes', FieldTypeKind: 3 },
                                { Title: 'CreatedBy', FieldTypeKind: 1 },
                                { Title: 'CreatedAt', FieldTypeKind: 4 },
                                { Title: 'OrganizationId', FieldTypeKind: 1 }
                            ])];
                    case 1:
                        // Create Project Tasks list
                        _a.sent();
                        // Create Task Overrides list
                        return [4 /*yield*/, this.createList('Task Overrides', [
                                { Title: 'ParentId', FieldTypeKind: 1 },
                                { Title: 'Deadline', FieldTypeKind: 4 },
                                { Title: 'Completed', FieldTypeKind: 8 },
                                { Title: 'Important', FieldTypeKind: 8 },
                                { Title: 'Notes', FieldTypeKind: 3 },
                                { Title: 'Deleted', FieldTypeKind: 8 },
                                { Title: 'CreatedBy', FieldTypeKind: 1 },
                                { Title: 'CreatedAt', FieldTypeKind: 4 },
                                { Title: 'OrganizationId', FieldTypeKind: 1 }
                            ])];
                    case 2:
                        // Create Task Overrides list
                        _a.sent();
                        console.log('SharePoint lists initialized successfully');
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Error initializing SharePoint lists:', error_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SharePointService.prototype.createList = function (listTitle, fields) {
        return __awaiter(this, void 0, void 0, function () {
            var listExists, createListResponse, listData, _i, fields_1, field, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        return [4 /*yield*/, this.listExists(listTitle)];
                    case 1:
                        listExists = _a.sent();
                        if (listExists) {
                            console.log("List '".concat(listTitle, "' already exists"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.context.spHttpClient.post("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists"), SPHttpClient.configurations.v1, {
                                headers: {
                                    'Accept': 'application/json;odata=nometadata',
                                    'Content-type': 'application/json;odata=nometadata',
                                    'odata-version': ''
                                },
                                body: JSON.stringify({
                                    Title: listTitle,
                                    BaseTemplate: 100,
                                    AllowContentTypes: true,
                                    ContentTypesEnabled: true
                                })
                            })];
                    case 2:
                        createListResponse = _a.sent();
                        if (!createListResponse.ok) return [3 /*break*/, 7];
                        return [4 /*yield*/, createListResponse.json()];
                    case 3:
                        listData = _a.sent();
                        console.log("List '".concat(listTitle, "' created with ID: ").concat(listData.d.Id));
                        _i = 0, fields_1 = fields;
                        _a.label = 4;
                    case 4:
                        if (!(_i < fields_1.length)) return [3 /*break*/, 7];
                        field = fields_1[_i];
                        return [4 /*yield*/, this.addFieldToList(listTitle, field)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 4];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_2 = _a.sent();
                        console.error("Error creating list '".concat(listTitle, "':"), error_2);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    SharePointService.prototype.listExists = function (listTitle) {
        return __awaiter(this, void 0, void 0, function () {
            var response, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.context.spHttpClient.get("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('").concat(listTitle, "')"), SPHttpClient.configurations.v1)];
                    case 1:
                        response = _b.sent();
                        return [2 /*return*/, response.ok];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SharePointService.prototype.addFieldToList = function (listTitle, field) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.context.spHttpClient.post("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('").concat(listTitle, "')/fields"), SPHttpClient.configurations.v1, {
                                headers: {
                                    'Accept': 'application/json;odata=nometadata',
                                    'Content-type': 'application/json;odata=nometadata',
                                    'odata-version': ''
                                },
                                body: JSON.stringify({
                                    Title: field.Title,
                                    FieldTypeKind: field.FieldTypeKind
                                })
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        console.error("Error adding field '".concat(field.Title, "' to list '").concat(listTitle, "':"), error_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // CRUD operations for tasks
    SharePointService.prototype.getTasks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, data, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.context.spHttpClient.get("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('Project Tasks')/items?$orderby=Deadline asc"), SPHttpClient.configurations.v1)];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        return [2 /*return*/, data.value.map(this.mapSharePointItemToTask)];
                    case 3: return [2 /*return*/, []];
                    case 4:
                        error_4 = _a.sent();
                        console.error('Error getting tasks:', error_4);
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SharePointService.prototype.addTask = function (task) {
        return __awaiter(this, void 0, void 0, function () {
            var response, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.context.spHttpClient.post("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('Project Tasks')/items"), SPHttpClient.configurations.v1, {
                                headers: {
                                    'Accept': 'application/json;odata=nometadata',
                                    'Content-type': 'application/json;odata=nometadata',
                                    'odata-version': ''
                                },
                                body: JSON.stringify(this.mapTaskToSharePointItem(task))
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.d.Id.toString()];
                    case 3: throw new Error('Failed to add task');
                    case 4:
                        error_5 = _a.sent();
                        console.error('Error adding task:', error_5);
                        throw error_5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SharePointService.prototype.updateTask = function (taskId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.context.spHttpClient.post("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('Project Tasks')/items(").concat(taskId, ")"), SPHttpClient.configurations.v1, {
                                headers: {
                                    'Accept': 'application/json;odata=nometadata',
                                    'Content-type': 'application/json;odata=nometadata',
                                    'odata-version': '',
                                    'X-HTTP-Method': 'MERGE',
                                    'IF-MATCH': '*'
                                },
                                body: JSON.stringify(this.mapTaskToSharePointItem(updates))
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_6 = _a.sent();
                        console.error('Error updating task:', error_6);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SharePointService.prototype.deleteTask = function (taskId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.context.spHttpClient.post("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('Project Tasks')/items(").concat(taskId, ")"), SPHttpClient.configurations.v1, {
                                headers: {
                                    'Accept': 'application/json;odata=nometadata',
                                    'Content-type': 'application/json;odata=nometadata',
                                    'odata-version': '',
                                    'X-HTTP-Method': 'DELETE',
                                    'IF-MATCH': '*'
                                }
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_7 = _a.sent();
                        console.error('Error deleting task:', error_7);
                        throw error_7;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // CRUD operations for task overrides
    SharePointService.prototype.getTaskOverrides = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, data, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.context.spHttpClient.get("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('Task Overrides')/items"), SPHttpClient.configurations.v1)];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        return [2 /*return*/, data.value.map(this.mapSharePointItemToTaskOverride)];
                    case 3: return [2 /*return*/, []];
                    case 4:
                        error_8 = _a.sent();
                        console.error('Error getting task overrides:', error_8);
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SharePointService.prototype.addTaskOverride = function (override) {
        return __awaiter(this, void 0, void 0, function () {
            var response, result, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.context.spHttpClient.post("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('Task Overrides')/items"), SPHttpClient.configurations.v1, {
                                headers: {
                                    'Accept': 'application/json;odata=nometadata',
                                    'Content-type': 'application/json;odata=nometadata',
                                    'odata-version': ''
                                },
                                body: JSON.stringify(this.mapTaskOverrideToSharePointItem(override))
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.d.Id.toString()];
                    case 3: throw new Error('Failed to add task override');
                    case 4:
                        error_9 = _a.sent();
                        console.error('Error adding task override:', error_9);
                        throw error_9;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    SharePointService.prototype.updateTaskOverride = function (overrideId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var error_10;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.context.spHttpClient.post("".concat(this.context.pageContext.web.absoluteUrl, "/_api/web/lists/getbytitle('Task Overrides')/items(").concat(overrideId, ")"), SPHttpClient.configurations.v1, {
                                headers: {
                                    'Accept': 'application/json;odata=nometadata',
                                    'Content-type': 'application/json;odata=nometadata',
                                    'odata-version': '',
                                    'X-HTTP-Method': 'MERGE',
                                    'IF-MATCH': '*'
                                },
                                body: JSON.stringify(this.mapTaskOverrideToSharePointItem(updates))
                            })];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_10 = _a.sent();
                        console.error('Error updating task override:', error_10);
                        throw error_10;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // Mapping functions
    SharePointService.prototype.mapSharePointItemToTask = function (item) {
        return {
            id: item.Id.toString(),
            projectName: item.ProjectName || '',
            description: item.Description || '',
            deadline: item.Deadline ? new Date(item.Deadline).toISOString().split('T')[0] : '',
            responsibleParty: item.ResponsibleParty || '',
            recurring: item.Recurring || false,
            frequency: item.Frequency || '',
            finalYear: item.FinalYear || '',
            important: item.Important || false,
            completed: item.Completed || false,
            notes: item.Notes || '',
            createdBy: item.CreatedBy || '',
            createdAt: item.CreatedAt ? new Date(item.CreatedAt) : new Date(),
            organizationId: item.OrganizationId || 'c-cdev'
        };
    };
    SharePointService.prototype.mapTaskToSharePointItem = function (task) {
        return {
            ProjectName: task.projectName,
            Description: task.description,
            Deadline: task.deadline,
            ResponsibleParty: task.responsibleParty,
            Recurring: task.recurring,
            Frequency: task.frequency,
            FinalYear: task.finalYear,
            Important: task.important,
            Completed: task.completed,
            Notes: task.notes,
            CreatedBy: task.createdBy || this.context.pageContext.user.displayName,
            CreatedAt: task.createdAt || new Date(),
            OrganizationId: task.organizationId || 'c-cdev'
        };
    };
    SharePointService.prototype.mapSharePointItemToTaskOverride = function (item) {
        return {
            id: item.Id.toString(),
            parentId: item.ParentId || '',
            deadline: item.Deadline ? new Date(item.Deadline).toISOString().split('T')[0] : '',
            completed: item.Completed || false,
            important: item.Important || false,
            notes: item.Notes || '',
            deleted: item.Deleted || false,
            createdBy: item.CreatedBy || '',
            createdAt: item.CreatedAt ? new Date(item.CreatedAt) : new Date(),
            organizationId: item.OrganizationId || 'c-cdev'
        };
    };
    SharePointService.prototype.mapTaskOverrideToSharePointItem = function (override) {
        return {
            ParentId: override.parentId,
            Deadline: override.deadline,
            Completed: override.completed,
            Important: override.important,
            Notes: override.notes,
            Deleted: override.deleted,
            CreatedBy: override.createdBy || this.context.pageContext.user.displayName,
            CreatedAt: override.createdAt || new Date(),
            OrganizationId: override.organizationId || 'c-cdev'
        };
    };
    return SharePointService;
}());
export { SharePointService };
//# sourceMappingURL=SharePointService.js.map