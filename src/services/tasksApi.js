import { diagnosticLogger, logApiCall } from '../utils/diagnostics';

const API =
  process.env.REACT_APP_API_BASE ||
  'https://cc-project-api.azurewebsites.net/api';

async function ok(res, method, path) {
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}`);
}

export async function getTasks() {
  const path = '/tasks';
  diagnosticLogger.log('API: getTasks - START', { path, url: `${API}${path}` });
  try {
    const r = await fetch(`${API}${path}`);
    await ok(r, 'GET', path);
    const { data } = await r.json();
    diagnosticLogger.log('API: getTasks - SUCCESS', { path, dataCount: Array.isArray(data) ? data.length : 'not array' });
    return data;
  } catch (error) {
    diagnosticLogger.log('API: getTasks - ERROR', { path, error: error.message }, 'error');
    throw error;
  }
}

export async function createTask(task) {
  const path = '/tasks';
  diagnosticLogger.log('API: createTask - START', { path, task });
  try {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    await ok(r, 'POST', path);
    const { data } = await r.json();
    diagnosticLogger.log('API: createTask - SUCCESS', { path, createdTask: data });
    return data;
  } catch (error) {
    // Check if this is a CORS error
    const isCorsError = error.message?.includes('CORS') || 
                       error.message?.includes('Access-Control-Allow-Origin') ||
                       error.name === 'TypeError' && error.message?.includes('Failed to fetch');
    
    if (isCorsError) {
      const corsError = new Error(
        `CORS Error: The API at ${API}${path} is not allowing requests from this origin. ` +
        `This is a backend configuration issue. Please ensure the Azure Functions app has CORS configured ` +
        `to allow requests from ${window.location.origin}. Error: ${error.message}`
      );
      diagnosticLogger.log('API: createTask - CORS ERROR', { 
        path, 
        task, 
        error: error.message,
        origin: window.location.origin,
        apiUrl: `${API}${path}`,
        corsError: corsError.message
      }, 'error');
      throw corsError;
    }
    
    diagnosticLogger.log('API: createTask - ERROR', { path, task, error: error.message }, 'error');
    throw error;
  }
}

export async function updateTask(id, updates) {
  const path = `/tasks?id=${encodeURIComponent(id)}`;
  const url = `${API}${path}`;
  const requestBody = JSON.stringify(updates);
  
  // EXTENSIVE DIAGNOSTIC LOGGING: Log all update details
  diagnosticLogger.log('API: updateTask - START_RAW', {
    id,
    idType: typeof id,
    path,
    url,
    updates,
    updatesType: typeof updates,
    updatesIsObject: typeof updates === 'object',
    updatesKeys: updates ? Object.keys(updates) : null,
    updatesStringified: JSON.stringify(updates),
    // For responsibleParty specifically
    responsiblePartyUpdate: updates?.responsibleParty,
    responsiblePartyUpdateType: typeof updates?.responsibleParty,
    responsiblePartyUpdateIsNull: updates?.responsibleParty === null,
    responsiblePartyUpdateIsUndefined: updates?.responsibleParty === undefined,
    responsiblePartyUpdateLength: updates?.responsibleParty ? (typeof updates.responsibleParty === 'string' ? updates.responsibleParty.length : 'not-string') : null,
    responsiblePartyUpdateStringified: updates?.responsibleParty ? JSON.stringify(updates.responsibleParty) : 'null/undefined',
    requestBody,
    requestBodyType: typeof requestBody,
    requestBodyLength: requestBody.length,
    timestamp: new Date().toISOString()
  });
  
  diagnosticLogger.log('API: updateTask - START', {
    id,
    path,
    url,
    updates,
    updatesKeys: updates ? Object.keys(updates) : null,
    responsiblePartyUpdate: updates?.responsibleParty,
    responsiblePartyUpdateType: typeof updates?.responsibleParty,
    responsiblePartyUpdateLength: updates?.responsibleParty ? (typeof updates.responsibleParty === 'string' ? updates.responsibleParty.length : 'not-string') : null,
    requestBody,
    requestBodyLength: requestBody.length,
    timestamp: new Date().toISOString()
  });
  
  const startTime = performance.now();
  
  try {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });
    
    const fetchTime = performance.now() - startTime;
    
    diagnosticLogger.log('API: updateTask - FETCH_COMPLETE', {
      id,
      status: r.status,
      statusText: r.statusText,
      headers: Object.fromEntries(r.headers.entries()),
      fetchTime: `${fetchTime.toFixed(2)}ms`
    });
    
    await ok(r, 'PUT', path);
    
    const responseText = await r.text();
    diagnosticLogger.log('API: updateTask - RESPONSE_TEXT', {
      id,
      responseText,
      responseLength: responseText.length,
      responseTextPreview: responseText.substring(0, 500)
    });
    
    let data;
    try {
      data = JSON.parse(responseText);
      const responseData = data?.data || data;
      diagnosticLogger.log('API: updateTask - RESPONSE_PARSED', {
        id,
        data,
        hasData: !!data.data,
        responseData,
        responseDataType: typeof responseData,
        responseDataKeys: responseData ? Object.keys(responseData) : null,
        // For responsibleParty specifically
        responsiblePartyInResponse: responseData?.responsibleParty || responseData?.ResponsibleParty,
        responsiblePartyInResponseType: typeof (responseData?.responsibleParty || responseData?.ResponsibleParty),
        responsiblePartyInResponseLength: (responseData?.responsibleParty || responseData?.ResponsibleParty) ? (typeof (responseData?.responsibleParty || responseData?.ResponsibleParty) === 'string' ? (responseData?.responsibleParty || responseData?.ResponsibleParty).length : 'not-string') : null,
        responsiblePartyInResponseStringified: (responseData?.responsibleParty || responseData?.ResponsibleParty) ? JSON.stringify(responseData?.responsibleParty || responseData?.ResponsibleParty) : 'null/undefined'
      });
    } catch (parseError) {
      diagnosticLogger.log('API: updateTask - PARSE_ERROR', {
        id,
        responseText,
        error: parseError.message
      }, 'error');
      throw parseError;
    }
    
    const totalTime = performance.now() - startTime;
    diagnosticLogger.log('API: updateTask - SUCCESS', {
      id,
      updates,
      response: data,
      totalTime: `${totalTime.toFixed(2)}ms`,
      fetchTime: `${fetchTime.toFixed(2)}ms`
    });
    
    return data.data || data;
  } catch (error) {
    const totalTime = performance.now() - startTime;
    diagnosticLogger.log('API: updateTask - ERROR', {
      id,
      updates,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      totalTime: `${totalTime.toFixed(2)}ms`
    }, 'error');
    throw error;
  }
}

export async function deleteTask(id) {
  const path = `/tasks?id=${encodeURIComponent(id)}`;
  diagnosticLogger.log('API: deleteTask - START', { id, path });
  try {
    const r = await fetch(`${API}${path}`, { method: 'DELETE' });
    diagnosticLogger.log('API: deleteTask - RESPONSE', { id, status: r.status, statusText: r.statusText });
    if (!r.ok && r.status !== 204) throw new Error(`DELETE ${path} ${r.status}`);
    diagnosticLogger.log('API: deleteTask - SUCCESS', { id });
    return true;
  } catch (error) {
    diagnosticLogger.log('API: deleteTask - ERROR', { id, error: error.message }, 'error');
    throw error;
  }
}
