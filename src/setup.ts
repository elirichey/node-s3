import dotenv from "dotenv";
dotenv.config();

import { Credentials, UploadCredentials } from "../interfaces/interfaces";

export function setupUploadCredentials(eventId: string) {
  const {
    BACKBLAZE_ACCESS_KEY_ID,
    BACKBLAZE_SECRET_ACCESS_KEY,
    BACKBLAZE_REGION,
    BACKBLAZE_BUCKET_NAME,
    BACKBLAZE_CDN_URL,
  } = process.env;

  const destinationPath = `events/${eventId}/media`;

  const credentials: UploadCredentials = {
    BACKBLAZE_ACCESS_KEY_ID: BACKBLAZE_ACCESS_KEY_ID || "",
    BACKBLAZE_SECRET_ACCESS_KEY: BACKBLAZE_SECRET_ACCESS_KEY || "",
    BACKBLAZE_REGION: BACKBLAZE_REGION || "",
     BACKBLAZE_BUCKET_NAME: BACKBLAZE_BUCKET_NAME || "",
    BACKBLAZE_DESTINATION_PATH: destinationPath,
    BACKBLAZE_CDN_URL: BACKBLAZE_CDN_URL || "",
  };

  return credentials;
}

export function setupQueryCredentials(bucketName: string) {
  const {
    BACKBLAZE_ACCESS_KEY_ID,
    BACKBLAZE_SECRET_ACCESS_KEY,
    BACKBLAZE_REGION,
    BACKBLAZE_BUCKET_NAME,
  } = process.env;

  const credentials: Credentials = {
    BACKBLAZE_ACCESS_KEY_ID: BACKBLAZE_ACCESS_KEY_ID || "",
    BACKBLAZE_SECRET_ACCESS_KEY: BACKBLAZE_SECRET_ACCESS_KEY || "",
    BACKBLAZE_REGION: BACKBLAZE_REGION || "",
    BACKBLAZE_BUCKET_NAME: bucketName || BACKBLAZE_BUCKET_NAME || "",
  };

  return credentials;
}