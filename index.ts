import { Config, getStack, Output, OutputInstance } from "@pulumi/pulumi";
import { Provider, ProviderArgs, Region } from "@pulumi/aws";

import { generateAwsProviders } from "./aws/utils";

// aws
import { AuroraConfig, createAuroraCluster } from "./aws/rds";
import { createVpc, createVpcRoutes } from "./aws/vpc";

// types
import {
  AwsProviderConfig,
  AwsProviders,
  ProviderConfig,
  Providers,
} from "./types";

import { AwsVpcConfig } from "./aws/vpc/types";

// stacks
import { handler as sandboxHandler } from "./sandbox-stacks";

function createAwsProvider(name: string, config: ProviderArgs): Provider {
  return new Provider(name, config);
}

function main(): any {
  const stack = getStack();
  const config = new Config(stack);

  if (stack === "rds") {
    const providerConfig = new Config("aws");
    const region = providerConfig.get<Region>("region");
    const profile = providerConfig.get<string>("profile");
    const provider = createAwsProvider(`${stack}-${region}-provider`, {
      region,
      profile,
      skipCredentialsValidation: true,
    });

    const auroraRdsConfig: AuroraConfig = config.requireObject("config");
    return createAuroraCluster(auroraRdsConfig, provider);
  } else if (stack === "vpc") {
    const stackConfig = new Config("stack");
    const providerConfigs =
      stackConfig.requireObject<AwsProviderConfig[]>("providers");
    const providers: AwsProviders = generateAwsProviders(providerConfigs);

    const vpcConfig = stackConfig.requireObject<AwsVpcConfig>("data");

    const vpcRtnObj: { vpcs: Output<string>[] } =
      { vpcs: [] };

    if (vpcConfig.vpcs) {
      for (const vpc of vpcConfig.vpcs) {
        vpcRtnObj.vpcs.push(
          createVpc(vpc, providers[vpc.region || "us-east-1"]).arn
        );
      }
    }

    if (vpcConfig.routes) {
      for (const route of vpcConfig.routes) {
        createVpcRoutes(route, providers[route.region]);
      }
    }

    return vpcRtnObj;
  } else if (stack.includes("sandbox")) {
    return sandboxHandler(stack);
  }

  return {};
}

export default main();
