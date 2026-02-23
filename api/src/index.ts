import { app } from '@azure/functions';
// This is the entry point for Azure Functions v4
// All function apps are registered when imported
import './functions/transcribe.js';

// The functions are registered via app.http() calls in the imported modules
// This file just needs to exist to trigger the module loading
