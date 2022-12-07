import { AwsProviders } from "../../../types";
import { S3Output } from "../../s3/types";
import { S3Config } from "../../s3/types";
import { createPrivateS3Bucket, createPublicS3Bucket } from "../../s3";

export function Init(config: S3Config, providers: AwsProviders): S3Output {
  const rtnObj: S3Output = { public: [], private: [] };
  if (config.public) {
    for (const bucketConfig in config.public) {
      const bucket = config.public[bucketConfig];
      const provider = providers[bucket.region];
      rtnObj.public.push(createPublicS3Bucket(bucket, provider));
    }
  }
  if (config.private) {
    for (const bucketConfig in config.private) {
      const bucket = config.private[bucketConfig];
      const provider = providers[bucket.region];
      rtnObj.private.push(createPrivateS3Bucket(bucket, provider));
    }
  }

  return rtnObj;
}
