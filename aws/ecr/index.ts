import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createRepository(name: string, provider: aws.Provider): pulumi.Output<string> {
  const repo = new aws.ecr.Repository(
    `${name}-ecr`,
    {
      name,
      encryptionConfigurations: [{ encryptionType: "AES256" }],
      imageTagMutability: "MUTABLE",
      imageScanningConfiguration: {
        scanOnPush: true,
      },
    },
    { provider }
  );

  new aws.ecr.LifecyclePolicy(
    `${name}-lifecyclePolicy`,
    {
      repository: repo.name,
      policy: {
        rules: [
          {
            action: {
              type: "expire",
            },
            rulePriority: 1,
            description: "Expire images older than 3 days",
            selection: {
              tagStatus: "untagged",
              countType: "sinceImagePushed",
              countNumber: 3,
              countUnit: "days",
            },
          },
        ],
      },
    },
    { provider, dependsOn: repo }
  );

  return repo.repositoryUrl;
}
