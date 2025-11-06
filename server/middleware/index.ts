/**
 * Middleware for database security and audit logging
 * 
 * This module provides Express middleware to enforce user-level data isolation
 * and track security-relevant events.
 * 
 * @module server/middleware
 */

export {
  validateSaveAccess,
  validateActiveSave,
} from "./validateSaveAccess";

export {
  auditLog,
  auditMiddleware,
  logUnauthorizedAccess,
  logSaveAccess,
  AuditAction,
  type AuditDetails,
} from "./auditLog";
