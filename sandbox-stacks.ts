import { Config } from "@pulumi/pulumi";
import { Providers, ProviderConfig } from "./types";
import { generateAwsProviders } from "./aws/utils";

// Controllers
import { Init as awsRdsController } from "./aws/controllers/rds";
import { Init as awsVpcController } from "./aws/controllers/vpc";
import { Init as awsSecretsController } from "./aws/controllers/secrets";
import { Init as awsIamController } from "./aws/controllers/iam";
import { Init as awsEcrController } from "./aws/controllers/ecr";
import { Init as awsVpnController } from "./aws/controllers/vpn";
import { Init as awsS3Controller } from "./aws/controllers/s3";


// Types
import { Types } from "./aws/rds/types";
import { AwsVpcConfig } from "./aws/vpc/types";
import { JsonSecret } from "./aws/secrets/types";
import { Iam } from "./aws/iam/types";
import { AwsClientVpnConfig } from "./aws/vpn/types";
import { S3Config } from "./aws/s3/types";


export function handler(stack: string) {
  const stackConfig = new Config("stack");
  const providerConfigs =
    stackConfig.requireObject<ProviderConfig>("providers");
  const providers = <Providers>{
    aws: generateAwsProviders(providerConfigs.aws || []),
  };

  if (stack.includes("iam")) {
    const iamConfig = stackConfig.requireObject<Iam>("data");
    if (providers.aws) {
      return awsIamController(iamConfig, providers.aws["us-east-1"]);
    }
  } else if (stack.includes("vpc")) {
    const stackVpcConfig = stackConfig.requireObject<AwsVpcConfig>("data");
    if (providers.aws) {
      return awsVpcController(stackVpcConfig, providers.aws);
    }
  } else if (stack.includes("rds")) {
    const auroraRdsConfig = stackConfig.requireObject<Types>("data");
    if (providers.aws) {
      return awsRdsController(auroraRdsConfig, providers.aws);
    }
  } else if (stack.includes("secrets")) {
    const secretConfigs = stackConfig.requireObject<{
      [env: string]: JsonSecret;
    }>("data");
    if (providers.aws) {
      return awsSecretsController(secretConfigs, providers.aws);
    }
  } else if (stack.includes("ecr")) {
    const repositories = stackConfig.requireObject<string>("data");
    if (providers.aws) {
      return awsEcrController(repositories, providers.aws["us-east-1"]);
    }
  } else if (stack.includes("vpn")) {
    const vpnConfig = stackConfig.requireObject<AwsClientVpnConfig>("data");
    if (providers.aws) {
      return awsVpnController(vpnConfig, providers.aws);
    }
  } else if (stack.includes("s3")) {
    const s3Config = stackConfig.requireObject<S3Config>("data");
    if (providers.aws) {
      return awsS3Controller(s3Config, providers.aws);
    }
  } else {
    throw new Error(`Unknown stack: ${stack}`);
  }

  return undefined;
}
