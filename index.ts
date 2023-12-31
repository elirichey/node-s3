require("dotenv").config();

import {
  ListObjectsCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";
import { PassThrough } from "stream";
import { program } from "commander";

import { CLIArguments, Credentials } from "./interfaces/interfaces";
import extensions from "./utilities/file-extensions";

async function run() {
  const eventIdMessage = "Please provide a valid event id for uploading";
  const postIdMessage = "Please provide a valid event post id";
  const pathMessage = "Please provide a valid file path for uploading";
  const keyMessage = "Please provide a valid key";
  const deleteMessage = "Please provide if value is true or false";

  program
    .requiredOption("-e, --eventId <type>", eventIdMessage)
    .option("-p, --path <type>", pathMessage)
    .option("-x, --post <type>", postIdMessage)
    .option("-k, --key <type>", keyMessage)
    .option("-b, --burn", deleteMessage);

  program.parse(process.argv);
  const options: CLIArguments = program.opts();
  const { eventId, post, path, key, burn } = options;

  function setupUploadCredentials(id: string) {
    const {
      BACKBLAZE_ACCESS_KEY_ID,
      BACKBLAZE_SECRET_ACCESS_KEY,
      BACKBLAZE_REGION,
      BACKBLAZE_BUCKET_NAME,
      BACKBLAZE_CDN_URL,
    } = process.env;

    const destinationPath = `events/${id}/media`;

    const credentials: Credentials = {
      BACKBLAZE_ACCESS_KEY_ID: BACKBLAZE_ACCESS_KEY_ID || "",
      BACKBLAZE_SECRET_ACCESS_KEY: BACKBLAZE_SECRET_ACCESS_KEY || "",
      BACKBLAZE_REGION: BACKBLAZE_REGION || "",
      BACKBLAZE_BUCKET_NAME: BACKBLAZE_BUCKET_NAME || "",
      BACKBLAZE_DESTINATION_PATH: destinationPath,
      BACKBLAZE_CDN_URL: BACKBLAZE_CDN_URL || "",
    };

    return credentials;
  }

  async function determineFileType(fileExt: string) {
    const res = (type: string) => {
      return { status: 100, message: `File Type Determined: ${type}` };
    };

    return await new Promise((resolve) => {
      let fileType: string;
      if (extensions.image.some((x) => x === `.${fileExt}`)) {
        fileType = "Image";
        console.log(res("Image"));
        return resolve(fileType);
      } else if (extensions.video.some((x) => x === `.${fileExt}`)) {
        fileType = "Video";
        console.log(res("Video"));
        return resolve(fileType);
      } else if (extensions.audio.some((x) => x === `.${fileExt}`)) {
        fileType = "Audio";
        console.log(res("Audio"));
        return resolve(fileType);
      } else if (extensions.text.some((x) => x === `.${fileExt}`)) {
        fileType = "Text";
        console.log(res("Text"));
        return resolve(fileType);
      } else {
        fileType = "";
        console.log(res("UNSET"));
        return resolve(fileType);
      }
    });
  }

  function getFileNameFromPath(file: string) {
    const pathParts = file.split(/[\\/]/);
    const fileName = pathParts[pathParts.length - 1];
    return fileName;
  }

  // List
  async function listFilesFromS3(keyVal: string) {
    const credentials: Credentials = setupUploadCredentials(eventId);
    const {
      BACKBLAZE_ACCESS_KEY_ID,
      BACKBLAZE_SECRET_ACCESS_KEY,
      BACKBLAZE_REGION,
      BACKBLAZE_BUCKET_NAME,
    } = credentials;

    const b2Config: any = {
      endpoint: `https://s3.${BACKBLAZE_REGION}.backblazeb2.com/`,
      forcePathStyle: true,
      region: BACKBLAZE_REGION,
      credentials: {
        accessKeyId: BACKBLAZE_ACCESS_KEY_ID,
        secretAccessKey: BACKBLAZE_SECRET_ACCESS_KEY,
      },
    };

    const b2Credentials = new S3Client(b2Config);
    const params = { Bucket: BACKBLAZE_BUCKET_NAME };
    const listCommand = new ListObjectsCommand(params);
    try {
      const data = await b2Credentials.send(listCommand);
      if (!data?.Contents) return [];
      const res = data?.Contents.filter((x: any) => x?.Key.includes(keyVal));
      return res;
    } catch (e) {
      console.log({ status: 400, body: e });
      return e;
    }
  }

  // Uploads

  async function multipartUploadFileToB2(file: any, id: string) {
    const credentials: Credentials = setupUploadCredentials(id);
    const {
      BACKBLAZE_ACCESS_KEY_ID,
      BACKBLAZE_SECRET_ACCESS_KEY,
      BACKBLAZE_REGION,
      BACKBLAZE_BUCKET_NAME,
      BACKBLAZE_DESTINATION_PATH,
    } = credentials;

    const fileName = getFileNameFromPath(file);
    const fileExt = fileName.split(".").pop() || "";
    const fileType = await determineFileType(fileExt);

    // Format as a stream, not a normal file
    const formattedFile = createReadStream(file);
    const uploadParams = {
      Bucket: BACKBLAZE_BUCKET_NAME,
      Key: `${BACKBLAZE_DESTINATION_PATH}/${fileName}`,
      Body: formattedFile.pipe(new PassThrough()),
    };

    const b2Config: any = {
      endpoint: `https://s3.${BACKBLAZE_REGION}.backblazeb2.com/`,
      forcePathStyle: true,
      region: BACKBLAZE_REGION,
      credentials: {
        accessKeyId: BACKBLAZE_ACCESS_KEY_ID,
        secretAccessKey: BACKBLAZE_SECRET_ACCESS_KEY,
      },
    };

    const b2Credentials = new S3Client(b2Config);
    console.log({ status: 100, message: "B2Client Initialized" });

    try {
      // Max Number of parts is 10,000
      const minPartSize = 1024 * 1024 * 20; // 20MB minimum
      const parallelUploadB2 = new Upload({
        client: b2Credentials,
        params: uploadParams, // tags: [], // optional tags
        queueSize: 4, // optional: concurrency configuration
        partSize: minPartSize, // optional: size of each part in bytes, min part size id 5MB
        leavePartsOnError: false, // optional: manually handle dropped parts
      });

      parallelUploadB2.on("httpUploadProgress", (progress) => {
        console.log({ progress });
        if (progress && progress.loaded && progress.total && progress.part) {
          const { part, loaded, total } = progress;
          const percentage = ((loaded / total) * 100).toFixed(2);
          const message = `${fileName} ----- Upload Progress: (${part})  ${percentage}%`;
          console.log({ status: 100, message });
        }
      });

      const data = await parallelUploadB2.done();
      if (data) {
        console.log("Upload Complete", { data, fileType });
        return { data, fileType };
      }
    } catch (e) {
      console.log({ status: 400, body: e });
      return e;
    }
  }

  // Delete
  async function deleteFilesFromS3(id: string) {
    const credentials: Credentials = setupUploadCredentials(id);
    const {
      BACKBLAZE_ACCESS_KEY_ID,
      BACKBLAZE_SECRET_ACCESS_KEY,
      BACKBLAZE_REGION,
      BACKBLAZE_BUCKET_NAME,
    } = credentials;

    const b2Config: any = {
      endpoint: `https://s3.${BACKBLAZE_REGION}.backblazeb2.com/`,
      forcePathStyle: true,
      region: BACKBLAZE_REGION,
      credentials: {
        accessKeyId: BACKBLAZE_ACCESS_KEY_ID,
        secretAccessKey: BACKBLAZE_SECRET_ACCESS_KEY,
      },
    };

    const b2Credentials = new S3Client(b2Config);
    console.log({ status: 100, message: "B2Client Initialized" });

    const keyVal = `events/${id}`;

    // List Items
    const data: any = await listFilesFromS3(keyVal);
    const keys = data?.map((x: any) => ({ Key: x?.Key }));
    if (!keys || keys.length === 0) {
      console.log({ status: 400, message: "No Files Found" });
      return { status: 400, message: "No Files Found" };
    }

    // Then Delete All Items
    const bucketParams = {
      Bucket: BACKBLAZE_BUCKET_NAME,
      Delete: { Objects: keys },
    };

    const deleteCommand = new DeleteObjectsCommand(bucketParams);
    try {
      const data = await b2Credentials.send(deleteCommand);
      const { Deleted } = data;
      const message = `Deleted ${Deleted?.length} files`;
      console.log({ status: 200, message, data, objects: Deleted });
      return data;
    } catch (e) {
      console.log({ status: 400, body: e });
      return e;
    }
  }

  async function deleteFileFromS3(id: string, postId: string) {
    const credentials: Credentials = setupUploadCredentials(id);
    const {
      BACKBLAZE_ACCESS_KEY_ID,
      BACKBLAZE_SECRET_ACCESS_KEY,
      BACKBLAZE_REGION,
      BACKBLAZE_BUCKET_NAME,
    } = credentials;

    const b2Config: any = {
      endpoint: `https://s3.${BACKBLAZE_REGION}.backblazeb2.com/`,
      forcePathStyle: true,
      region: BACKBLAZE_REGION,
      credentials: {
        accessKeyId: BACKBLAZE_ACCESS_KEY_ID,
        secretAccessKey: BACKBLAZE_SECRET_ACCESS_KEY,
      },
    };

    const b2Credentials = new S3Client(b2Config);
    console.log({ status: 100, message: "B2Client Initialized" });

    const keyVal = `events/${id}/media/${postId}`;

    const data: any = await listFilesFromS3(keyVal);
    const keys = data?.map((x: any) => ({ Key: x?.Key }));

    if (!keys || keys.length === 0) {
      console.log({ status: 400, message: "No Files Found" });
      return { status: 400, message: "No Files Found" };
    }

    const bucketParams = {
      Bucket: BACKBLAZE_BUCKET_NAME,
      Delete: { Objects: keys },
    };

    const deleteCommand = new DeleteObjectsCommand(bucketParams);

    try {
      const data = await b2Credentials.send(deleteCommand);
      console.log({ status: 200, message: "File Deleted", data });
      return data;
    } catch (e) {
      console.log({ status: 400, body: e });
      return e;
    }
  }

  if (key && !path) {
    const res = await listFilesFromS3(key);
    return res;
  } else if (burn && post) {
    const res = await deleteFileFromS3(eventId, post);
    return res;
  } else if (burn && !post) {
    if (eventId.trim() === "") {
      console.log({ status: 400, message: "Event Id is required" });
      return { status: 400, message: "Event Id is required" };
    }
    const res = await deleteFilesFromS3(eventId);
    return res;
  } else if (path && !key) {
    const res = await multipartUploadFileToB2(path, eventId);
    return res;
  }
}

// const testEventId = "c34e4d8e-a333-4f7e-be1e-8d4e1ee87be9";
// const postId = "feaf4caf-0e3e-488a-a376-99595af72695";
// const key = `events/${eventId}/media/${postId}`;

run();
