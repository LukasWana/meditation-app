// Services exports
// Explicitní re-exporty z firebase (místo export * pro lepší kompatibilitu s minifikací)
export { app, storage, db, auth, database } from '@config/secure-firebase';
export { uiDataCollector } from './uiDataCollector';
export { fastMetadataService } from './fastMetadataService';
export { realtimeMetadataService } from './realtimeMetadataService';
