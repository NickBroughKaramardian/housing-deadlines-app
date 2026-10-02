// Azure Functions v4 entry point.
// Requiring these modules registers the HTTP functions as a side effect;
// no export is needed.
require('./src/functions/tasks');
require('./src/functions/websocket');
require('./src/functions/users');
