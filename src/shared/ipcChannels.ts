export const IPC = {
  JOB_STATE_UPDATE: 'job:state-update',
  BATCH_STATE_UPDATE: 'batch:state-update',
  ENGINE_CAPABILITIES: 'engine:capabilities',
  CANCEL_JOB: 'job:cancel',
  CANCEL_ALL: 'batch:cancel-all',
  GET_CAPABILITIES: 'engine:get-capabilities',
  ADD_FILES: 'batch:add-files',
} as const;
