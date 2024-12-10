import {
  S3Client,
  DeleteObjectsCommand,
  ListObjectsCommand,
  HeadBucketCommand,
  HeadBucketCommandOutput,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";
import { PassThrough } from "stream";


import { Credentials } from "../interfaces/interfaces";
import {getFileNameFromPath, determineFileType} from './utils'
import { setupQueryCredentials, setupUploadCredentials } from "./setup";

// List Items

export async function getListOfBuckets() {
  const credentials: Credentials = setupQueryCredentials('');
  const {
    BACKBLAZE_ACCESS_KEY_ID,
    BACKBLAZE_SECRET_ACCESS_KEY,
    BACKBLAZE_REGION,
  } = credentials;

  const b2Config = {
    endpoint: `https://s3.${BACKBLAZE_REGION}.backblazeb2.com/`, 
    forcePathStyle: true,
    region: BACKBLAZE_REGION, 
    credentials: {
      accessKeyId: BACKBLAZE_ACCESS_KEY_ID, 
      secretAccessKey: BACKBLAZE_SECRET_ACCESS_KEY, 
    },
  };
  
  const b2Credentials = new S3Client(b2Config);
  const bucketCommand = new ListBucketsCommand({});
  
  try {
    const data = await b2Credentials.send(bucketCommand);
    
    if (data.Buckets) {
      console.log("Buckets:", data.Buckets);
    } else {
      console.log("No buckets found or an error occurred.");
    }
    
    return data.Buckets || []; 
  } catch (e) {
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log(res);
    return res;
  }
}

export async function checkIfBucketExists(bucket: string) {
  const credentials: Credentials = setupQueryCredentials(bucket);
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
  const bucketCommand = new HeadBucketCommand(params);  
  try {
    const data: HeadBucketCommandOutput = await b2Credentials.send(bucketCommand);
    const res = data?.$metadata;
    return { name: bucket, status: res.httpStatusCode, ...res };
  } catch (e) {
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log(res);
    return res;
  }
}

export async function listFilesFromS3(bucket: string) {
  const credentials: Credentials = setupQueryCredentials(bucket);
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
    const totalItems = data.Contents.length
    const items = data.Contents
    return { totalItems, items }
  } catch (e) {
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log(res);
    return res;
  }
}

export async function filterFilesFromS3(keyVal: string, eventId: string) {
  const credentials: Credentials = setupQueryCredentials(eventId);
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
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log(res);
    return res;
  }
}

// Uploads

export async function multipartUploadFileToB2(file: any, eventId: string) {
  const credentials: Credentials = setupUploadCredentials(eventId);
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
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log(res);
    return res;
  }
}

// Delete - Single

export async function deleteFileFromS3(eventId: string, postId: string) {
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
  console.log({ status: 100, message: "B2Client Initialized" });

  const keyVal = `events/${eventId}/media/${postId}`;

  const data: any = await filterFilesFromS3(keyVal, eventId);
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
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log(res);
    return res;
  }
}

// Delete - Many

export async function deleteFilesFromS3(eventId: string) {
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
  console.log({ status: 100, message: "B2Client Initialized" });

  const keyVal = `events/${eventId}`;

  // List Items
  const data: any = await filterFilesFromS3(keyVal, eventId);
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
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log(res);
    return res;
  }
}

// Create Bucket

export async function createNewBucket(bucket: string) {
  const bucketExists = await checkIfBucketExists(bucket);
  if (bucketExists.status === 200) {
    const res = { status: 400, message: 'Bucket already exists' };
    console.log(res)
    return res;
  };

  console.log('Create Bucket: Continue... ' + bucket); 

  const credentials: Credentials = setupUploadCredentials('');
  const {
    BACKBLAZE_ACCESS_KEY_ID,
    BACKBLAZE_SECRET_ACCESS_KEY,
    BACKBLAZE_REGION,
  } = credentials;

  const params = {
    Bucket: bucket,
    CreateBucketConfiguration: {
      LocationConstraint: BACKBLAZE_REGION
    },    
  };

  const s3Params = {
    endpoint: `https://s3.${BACKBLAZE_REGION}.backblazeb2.com/`,
    forcePathStyle: true,
    region: BACKBLAZE_REGION,
    credentials: {
      accessKeyId: BACKBLAZE_ACCESS_KEY_ID,
      secretAccessKey: BACKBLAZE_SECRET_ACCESS_KEY,
    },
  }

  const newBucket = new CreateBucketCommand(params)
  const s3 = new S3Client(s3Params);

  try {
    const data = await s3.send(newBucket);
    console.log('Bucket Created:' ,{data})
  } catch (e) {
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log({e, res});
    return res;
  }
};

// Delete Bucket

export async function destroyBucket(bucket: string) {
  const bucketExists = await checkIfBucketExists(bucket);
  if (bucketExists.status !== 200) {
    return { status: 400, message: 'Bucket does not exist' };
  };

  console.log('Destory Bucket: Continue...');

  const credentials: Credentials = setupUploadCredentials('');
  const {
    BACKBLAZE_ACCESS_KEY_ID,
    BACKBLAZE_SECRET_ACCESS_KEY,
    BACKBLAZE_REGION,
  } = credentials;

  const params = {
    Bucket: bucket,
    CreateBucketConfiguration: {
      LocationConstraint: BACKBLAZE_REGION
    },    
  };

  const s3Params = {
    endpoint: `https://s3.${BACKBLAZE_REGION}.backblazeb2.com/`,
    forcePathStyle: true,
    region: BACKBLAZE_REGION,
    credentials: {
      accessKeyId: BACKBLAZE_ACCESS_KEY_ID,
      secretAccessKey: BACKBLAZE_SECRET_ACCESS_KEY,
    },
  }

  const deleteBucket = new DeleteBucketCommand(params)
  const s3 = new S3Client(s3Params);

  try {
    const data = await s3.send(deleteBucket);
    console.log('Bucket Deleted:' ,{data})
  } catch (e) {
    const res = { 
      status: e?.$metadata.httpStatusCode || 400, 
      body: e?.$metadata || {} 
    };
    console.log({e, res});
    return res;
  }
};