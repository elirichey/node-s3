import { program } from "commander";

import { CLIArguments } from "./interfaces/interfaces";
import { 
  getListOfBuckets,
  checkIfBucketExists, 
  listFilesFromS3, 
  filterFilesFromS3, 
  multipartUploadFileToB2, 
  deleteFileFromS3, 
  deleteFilesFromS3, 
  createNewBucket, 
  destroyBucket 
} from './src/actions'

async function run() {
  const eventIdMessage = "Please provide a valid event id";
  const bucketMessage = 'Please provide a bucket name'
  // const bucketsMessage = "Please provide if value is true or false";
  const postIdMessage = "Please provide a valid event post id";
  const pathMessage = "Please provide a valid file path for uploading";
  const keyMessage = "Please provide a valid key";
  const createMessage = "Please provide if value is true or false";
  const deleteMessage = "Please provide if value is true or false";

  program
    .option("-e, --eventId <type>", eventIdMessage) // requiredOption
    .option("-b, --bucket <type>", bucketMessage) // requiredOption
    // .option("-B, --buckets", bucketsMessage)
    .option("-p, --path <type>", pathMessage)
    .option("-x, --post <type>", postIdMessage)
    .option("-k, --key <type>", keyMessage)
    .option("-c, --create", createMessage)
    .option("-d, --destroy", deleteMessage);

  program.parse(process.argv);
  const options: CLIArguments = program.opts();
  const { eventId, bucket, path, post, key, create, destroy } = options;


  const testEventId = eventId ||'';
  const eventIdIsEmpty = testEventId.trim() === '';

  const isListFiles = key && !path;
  const isDeleteFile = destroy && post;
  const isDeleteFiles = destroy && !post && !eventIdIsEmpty;
  const isUploadFile = path && !key;

  const isCreateBucket = bucket && create;
  const isDeleteBucket = bucket && destroy;

  const eventIdRequired = eventId &&
    (isListFiles || 
    isDeleteFile || 
    isDeleteFiles || 
    isUploadFile);

  // POST ACTIONS

  if (eventIdRequired) {
    if (isListFiles) {
      const res = await filterFilesFromS3(key, eventId);
      return res;
    };
    if (isDeleteFile) {
      const res = await deleteFileFromS3(eventId, post);
      return res;
    };
    if (isDeleteFiles) {
      const res = await deleteFilesFromS3(eventId);
      return res;
    };
    if (isUploadFile) {
      const res = await multipartUploadFileToB2(path, eventId);
      return res;
    };
  };

  // BUCKET ACTIONS

  //if (buckets) { const res = await getListOfBuckets();return res;}

  if (!bucket) {
    console.log({status: 400, message: bucketMessage});
    return;
  };

  if (isCreateBucket) {
    const res = await createNewBucket(bucket);
    return res;
  };

  if (isDeleteBucket) {
    const res = await destroyBucket(bucket);
    return res;
  };
  
  const res = await checkIfBucketExists(bucket); // await listFilesFromS3(bucket);
  console.log({res});
}

run();
