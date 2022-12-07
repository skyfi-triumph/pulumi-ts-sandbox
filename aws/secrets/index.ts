import * as aws from "@pulumi/aws";
import { AuroraSecret, JsonSecret, SecretManager } from "./types";

function createAuroraSecret(config: AuroraSecret, provider: aws.Provider): aws.secretsmanager.Secret {
  const auroraSecret: aws.secretsmanager.Secret = new aws.secretsmanager.Secret(
    `${config.name}-secret`,
    {
      name: config.name,
      policy: aws.iam
        .getPolicyDocument({
          statements: [
            {
              sid: "ReadWriteSecret",
              effect: "Allow",
              actions: ["secretsmanager:GetSecretValue"],
              principals: [{ type: "AWS", identifiers: [<string>config.role] }],
              resources: ["*"],
            },
          ],
        })
        .then((doc) => doc.json),
    },
    { provider }
  );

  const secretObj = Object.assign({}, config);
  delete secretObj.create;
  delete secretObj.role;

  new aws.secretsmanager.SecretVersion(
    `${config.name}-secret-version`,
    {
      secretId: auroraSecret.id,
      secretString: JSON.stringify(secretObj),
    },
    { provider }
  );

  return auroraSecret;
}

function createJsonSecret(config: JsonSecret, provider: aws.Provider): aws.secretsmanager.Secret {
  const secret = new aws.secretsmanager.Secret(
    config.name,
    {
      name: config.name,
    },
    { provider }
  );

  new aws.secretsmanager.SecretVersion(
    `${config.name}-secret-version`,
    {
      secretId: secret.id,
      secretString: JSON.stringify(config.data),
    },
    { provider }
  );

  return secret;
}

export function createSecret(
  config: SecretManager,
  provider: aws.Provider
): aws.secretsmanager.Secret | Promise<void> | undefined {
  if (config.rds && config.rds.create) {
    return createAuroraSecret(config.rds, provider);
  }

  if (config.json) {
    return createJsonSecret(config.json, provider);
  }

  return undefined;
}
