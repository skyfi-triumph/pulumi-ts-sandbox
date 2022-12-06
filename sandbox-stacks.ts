import { Config } from "@pulumi/pulumi";
import { Providers, ProviderConfig } from "./types";
import { generateAwsProviders } from "./aws/utils";

// Controllers
import { Init as awsRdsController } from "./aws/controllers/rds";
import { Init as awsVpcController } from "./aws/controllers/vpc";

// Types
import { Types } from "./aws/rds/types";
import { AwsVpcConfig } from "./aws/vpc/types";


export function handler(stack: string) {
  const stackConfig = new Config("stack");
  const providerConfigs =
    stackConfig.requireObject<ProviderConfig>("providers");
  const providers = <Providers>{
    aws: generateAwsProviders(providerConfigs.aws || []),
  };

  if (stack.includes("vpc")) {
    const stackVpcConfig = stackConfig.requireObject<AwsVpcConfig>("data");
    if (providers.aws) {
      return awsVpcController(stackVpcConfig, providers.aws);
    }
  } else if (stack.includes("rds")) {
    const auroraRdsConfig = stackConfig.requireObject<Types>("data");
    if (providers.aws) {
      return awsRdsController(auroraRdsConfig, providers.aws);
    }
  } else {
    throw new Error(`Unknown stack: ${stack}`);
  }

  return undefined;
}
