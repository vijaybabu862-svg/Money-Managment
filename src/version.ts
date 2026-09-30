/**
 * CASH FLOW — Unified Application Version Source
 * Stage 10 Production Release Engineering
 */

export const APP_VERSION = '2.10.0';
export const SCHEMA_VERSION = 10;
export const BUILD_VERSION = '2026.10.release';
export const BUILD_TARGET = 'production';
export const SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface VersionInfo {
  appVersion: string;
  schemaVersion: number;
  buildVersion: string;
  buildTarget: string;
  isSupportedSchema: (ver: number) => boolean;
}

export const CURRENT_VERSION: VersionInfo = {
  appVersion: APP_VERSION,
  schemaVersion: SCHEMA_VERSION,
  buildVersion: BUILD_VERSION,
  buildTarget: BUILD_TARGET,
  isSupportedSchema: (ver: number) => SUPPORTED_SCHEMA_VERSIONS.includes(ver),
};
