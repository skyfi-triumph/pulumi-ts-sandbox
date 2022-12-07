import { Output } from "@pulumi/pulumi";
import { Secret } from "@pulumi/aws/secretsmanager";
import { AwsProviders } from "../../../types";
import { createSecret } from "../../secrets";
import { JsonSecret } from "../../secrets/types";

export function Init(stackSecretsConfig: { [env: string]: JsonSecret }, providers: AwsProviders): Output<string>[] {
  const rtnObj: Output<string>[] = [];
  const provider = providers["us-east-1"];
  if (provider) {
    Object.keys(stackSecretsConfig).forEach((env) => {
      const secretConfig = stackSecretsConfig[env];
      rtnObj.push(
        (<Secret>createSecret(
          {
            json: {
              name: secretConfig.name,
              data: secretConfig.data,
            },
          },
          provider
        )).arn
      );
    });
  }
  return rtnObj;
}
