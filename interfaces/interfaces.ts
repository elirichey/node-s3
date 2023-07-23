export interface CLIArguments {
  path: string;
  eventId: string;
}

export interface Credentials {
  BACKBLAZE_ACCESS_KEY_ID: string;
  BACKBLAZE_SECRET_ACCESS_KEY: string;
  BACKBLAZE_REGION: string;
  BACKBLAZE_BUCKET_NAME: string;
  BACKBLAZE_DESTINATION_PATH: string;
  BACKBLAZE_CDN_URL?: string;
}