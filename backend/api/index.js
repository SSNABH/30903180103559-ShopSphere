// Serverless entry point for Vercel.
//
// The Express application is exported directly instead of being started with
// app.listen(), because Vercel invokes it per request rather than running a
// long-lived server. src/server.js is still the entry point for Docker and for
// the Kubernetes pods, where a listening server is what is wanted.
import { app } from '../src/app.js';

export default app;
