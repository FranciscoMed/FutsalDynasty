import type { Request, Response } from "express";
import { db } from "../db";
import { auditLogs } from "@shared/schema";

/**
 * Security event types for audit logging
 */
export enum AuditAction {
  // Authentication events
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  REGISTER = "REGISTER",
  
  // Save game access events
  SAVE_ACCESS_GRANTED = "SAVE_ACCESS_GRANTED",
  SAVE_ACCESS_DENIED = "SAVE_ACCESS_DENIED",
  SAVE_CREATED = "SAVE_CREATED",
  SAVE_LOADED = "SAVE_LOADED",
  SAVE_DELETED = "SAVE_DELETED",
  
  // Data modification events
  TEAM_MODIFIED = "TEAM_MODIFIED",
  PLAYER_MODIFIED = "PLAYER_MODIFIED",
  MATCH_SIMULATED = "MATCH_SIMULATED",
  TRANSFER_EXECUTED = "TRANSFER_EXECUTED",
  FINANCIAL_TRANSACTION = "FINANCIAL_TRANSACTION",
  
  // Security violations
  UNAUTHORIZED_ACCESS_ATTEMPT = "UNAUTHORIZED_ACCESS_ATTEMPT",
  INVALID_SAVE_ID = "INVALID_SAVE_ID",
  SESSION_HIJACK_ATTEMPT = "SESSION_HIJACK_ATTEMPT",
}

/**
 * Additional context data for audit events
 */
export interface AuditDetails {
  endpoint?: string;
  method?: string;
  resourceId?: number;
  resourceType?: string;
  oldValue?: any;
  newValue?: any;
  errorMessage?: string;
  [key: string]: any;
}

/**
 * Log a security-relevant event to the audit_logs table
 * 
 * @param action - Type of action being performed (from AuditAction enum)
 * @param userId - ID of user performing action (null for unauthenticated events)
 * @param savegameId - ID of save game being accessed (null if not applicable)
 * @param details - Additional context data (endpoint, resource IDs, error messages, etc.)
 * @param req - Express request object (for IP address and user agent extraction)
 * 
 * @example
 * // Log successful save game access
 * await auditLog(
 *   AuditAction.SAVE_ACCESS_GRANTED,
 *   userId,
 *   savegameId,
 *   { endpoint: "/api/teams", method: "GET" },
 *   req
 * );
 * 
 * @example
 * // Log unauthorized access attempt
 * await auditLog(
 *   AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
 *   userId,
 *   attemptedSavegameId,
 *   { 
 *     endpoint: "/api/teams/123",
 *     errorMessage: "User attempted to access save game they don't own"
 *   },
 *   req
 * );
 */
export async function auditLog(
  action: AuditAction,
  userId: number | null,
  savegameId: number | null,
  details: AuditDetails,
  req?: Request
): Promise<void> {
  try {
    // Extract IP address from request
    // Handle proxy scenarios with X-Forwarded-For header
    const ipAddress = req
      ? (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket.remoteAddress ||
        null
      : null;

    // Extract user agent from request headers
    const userAgent = req?.headers["user-agent"] || null;

    // Insert audit log record
    await db.insert(auditLogs).values({
      userId: userId,
      saveGameId: savegameId,
      action,
      details: details as any, // JSONB field accepts any JSON-serializable object
      ipAddress,
      userAgent,
      // createdAt is automatically set by database default
    });
  } catch (error) {
    // Critical: Audit logging failures should NOT break the application
    // Log to console but allow request to continue
    console.error("Failed to write audit log:", {
      action,
      userId,
      savegameId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Middleware wrapper for automatic audit logging on routes
 * Logs request details before processing
 * 
 * @example
 * app.delete(
 *   "/api/savegames/:id",
 *   requireAuth,
 *   auditMiddleware(AuditAction.SAVE_DELETED),
 *   async (req, res) => {
 *     // Handler logic
 *   }
 * );
 */
export function auditMiddleware(action: AuditAction) {
  return async (req: Request, res: Response, next: Function) => {
    const userId = req.session?.userId || null;
    const savegameId =
      parseInt(req.params.savegameId || req.params.id || "") ||
      req.session?.activeSaveGameId ||
      null;

    await auditLog(
      action,
      userId,
      savegameId,
      {
        endpoint: req.path,
        method: req.method,
        query: req.query,
        params: req.params,
      },
      req
    );

    next();
  };
}

/**
 * Log unauthorized access attempts for security monitoring
 * Use this when users try to access resources they don't own
 * 
 * @example
 * if (team.userId !== req.session.userId) {
 *   await logUnauthorizedAccess(req, savegameId, "teams", teamId);
 *   return res.status(403).json({ error: "Access denied" });
 * }
 */
export async function logUnauthorizedAccess(
  req: Request,
  attemptedSavegameId: number,
  resourceType: string,
  resourceId?: number
): Promise<void> {
  await auditLog(
    AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
    req.session?.userId || null,
    attemptedSavegameId,
    {
      endpoint: req.path,
      method: req.method,
      resourceType,
      resourceId,
      errorMessage: `User ${req.session?.userId || "anonymous"} attempted to access ${resourceType} ${resourceId || ""} in save game ${attemptedSavegameId}`,
    },
    req
  );
}

/**
 * Log save game access for compliance/monitoring
 * Use in validateSaveAccess middleware to track all access patterns
 */
export async function logSaveAccess(
  req: Request,
  userId: number,
  savegameId: number,
  granted: boolean
): Promise<void> {
  await auditLog(
    granted ? AuditAction.SAVE_ACCESS_GRANTED : AuditAction.SAVE_ACCESS_DENIED,
    userId,
    savegameId,
    {
      endpoint: req.path,
      method: req.method,
      granted,
    },
    req
  );
}
