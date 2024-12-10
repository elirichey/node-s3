export interface CLIArguments {
  eventId?: string;
  bucket?: string;
  buckets?: string;
  post?: string;
  path?: string;
  key?: string;
  create?: boolean;
  destroy?: boolean;
}

export interface Credentials {
  BACKBLAZE_ACCESS_KEY_ID: string;
  BACKBLAZE_SECRET_ACCESS_KEY: string;
  BACKBLAZE_REGION: string;
  BACKBLAZE_BUCKET_NAME: string;
  BACKBLAZE_DESTINATION_PATH?: string;
  BACKBLAZE_CDN_URL?: string;
}

export interface UploadCredentials {
  BACKBLAZE_ACCESS_KEY_ID: string;
  BACKBLAZE_SECRET_ACCESS_KEY: string;
  BACKBLAZE_REGION: string;
  BACKBLAZE_BUCKET_NAME: string;
  BACKBLAZE_DESTINATION_PATH: string;
  BACKBLAZE_CDN_URL?: string;
}
