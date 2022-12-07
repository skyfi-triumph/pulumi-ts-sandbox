import * as aws from "@pulumi/aws";
import { GetPolicyDocumentArgs } from "@pulumi/aws/iam";
import { s3 } from "@pulumi/aws/types/input";
import BucketVersioning = s3.BucketVersioning;

export interface S3Config {
  public?: { [key: string]: BucketConfig };
  private?: { [key: string]: BucketConfig };
}

export type BucketConfig = {
  name: string;
  region: string;
  policy?: GetPolicyDocumentArgs;
  logBucket: string;
  logPrefix: string;
  tags?: { [k: string]: string };
  versioning?: BucketVersioning;
};

export interface S3Output {
  public: aws.s3.Bucket[];
  private: aws.s3.Bucket[];
}

type Buckets = {
  [key: string]: aws.s3.Bucket;
};
