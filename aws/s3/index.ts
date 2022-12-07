import * as aws from "@pulumi/aws";
import { BucketConfig } from "./types";
import { getPolicyDocument } from "@pulumi/aws/iam";

export function createPublicS3Bucket(config: BucketConfig, provider: aws.Provider) {
  const loggings = [];
  if (config.logBucket && config.logPrefix) {
    loggings.push({
      targetBucket: config.logBucket,
      targetPrefix: config.logPrefix,
    });
  }

  let policyDoc;
  if (config.policy) {
    policyDoc = getPolicyDocument({ statements: config.policy.statements }).then((doc) => doc.json);
  }

  return new aws.s3.Bucket(
    `${config.name}-bucket`,
    {
      acl: "public-read",
      bucket: config.name,
      policy: policyDoc,
      tags: { ...config.tags },
      loggings,
      versioning: config.versioning,
    },
    { provider }
  );
}

export function createPrivateS3Bucket(config: BucketConfig, provider: aws.Provider) {
  const loggings = [];
  if (config.logBucket && config.logPrefix) {
    loggings.push({
      targetBucket: config.logBucket,
      targetPrefix: config.logPrefix,
    });
  }

  let policyDoc;
  if (config.policy) {
    policyDoc = getPolicyDocument({ statements: config.policy.statements }).then((doc) => doc.json);
  }

  return new aws.s3.Bucket(
    `${config.name}-bucket`,
    {
      acl: "private",
      bucket: config.name,
      policy: policyDoc,
      tags: { ...config.tags },
      loggings,
      versioning: config.versioning,
    },
    { provider }
  );
}
