// import { S3 } from "aws-sdk";
const {S3} = require('aws-sdk')
const BUCKET_NAME = "temp-anish";
const REGION = "ap-south-1";
const s3 = new S3({
  region: REGION,
  signatureVersion: "v4",
});

const getSignedUrlForUpload = async (key, contentType, acl = null) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: 300,
    ContentType: contentType,
  };
  if (acl) {
    params.ACL = acl;
  }

  const url = await new Promise((resolve, reject) => {
    s3.getSignedUrl("putObject", params, (err, result) => {
      if (err) reject(err);

      resolve(result);
    });
  });

  return url;
};

const uploadUrl = async (query) => {
  try {
    const { fileName, contentType, type = "pdf" } = query;
    const acl = "public-read";
    const key = `${type}/${fileName}`;
    const url = await getSignedUrlForUpload(key, contentType, acl);
    return { url };
  } catch (err) {
    return err;
  }
};
