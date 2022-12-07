import { Config, getStack, Output, OutputInstance } from "@pulumi/pulumi";
import { Provider, ProviderArgs, Region } from "@pulumi/aws";
import { Secret } from "@pulumi/aws/secretsmanager";
import { generateAwsProviders } from "./aws/utils";

// aws
import { AuroraConfig, createAuroraCluster } from "./rds";
import { createVpc, createVpcRoutes } from "./aws/vpc";
import { createRepository } from "./ecr";
import { createIam } from "./aws/iam";
import { createS3Buckets, S3 } from "./s3";
import { createSecret, JsonSecret } from "./secretsmanager";
import { createTransitVpnGateway, TransitVpnConfig } from "./vpn";

// types
import {
  AwsProviderConfig,
  AwsProviders,
  ProviderConfig,
  Providers,
} from "./types";
import { AwsVpcConfig } from "./aws/vpc/types";
import { Iam } from "./aws/iam/types";

// stacks
import { handler as devHandler } from "./dev-stacks";
import { handler as stagingHandler } from "./staging-stacks";
import { handler as prodHandler } from "./prod-stacks";

function createAwsProvider(name: string, config: ProviderArgs): Provider {
  return new Provider(name, config);
}

function main(): any {
  const stack = getStack();
  const config = new Config(stack);

  if (stack === "ecr") {
    const providerConfig = new Config("aws");
    const region = providerConfig.get<Region>("region");
    const profile = providerConfig.get<string>("profile");
    const provider = createAwsProvider(`${stack}-${region}-provider`, {
      region,
      profile,
    });

    const repositories = config.requireObject<string>("repositories");
    const urls = [];
    for (const repo of repositories) {
      urls.push(createRepository(repo, provider));
    }

    return urls;
  } else if (stack === "iam") {
    const providerConfig = new Config("aws");
    const region = providerConfig.get<Region>("region");
    const profile = providerConfig.get<string>("profile");
    const provider = createAwsProvider(`${stack}-${region}-provider`, {
      region,
      profile,
      skipCredentialsValidation: true,
    });

    const iamConfig = config.requireObject<Iam>("config");
    return createIam(iamConfig, provider);
  } else if (stack === "s3") {
    const providerConfig = new Config("aws");
    const region = providerConfig.get<Region>("region");
    const profile = providerConfig.get<string>("profile");
    const provider = createAwsProvider(`${stack}-${region}-provider`, {
      region,
      profile,
      skipCredentialsValidation: true,
    });

    const s3Config = config.requireObject<S3>("config");
    return createS3Buckets(s3Config, provider);
  } else if (stack === "rds") {
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

    const vpcRtnObj: { vpcs: Output<string>[] } = { vpcs: [] };

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
  } else if (stack.includes("dev")) {
    return devHandler(stack);
  } else if (stack.includes("staging")) {
    return stagingHandler(stack);
  } else if (stack.includes("prod")) {
    return prodHandler(stack);
  }

  return {};
}

export default main();
