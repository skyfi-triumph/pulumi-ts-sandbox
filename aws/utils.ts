
import { Provider as ProviderAWS, Region } from "@pulumi/aws";
import {
  AwsProviders,
  AwsProviderConfig,
} from "../types";

export function generateAwsProviders(
  config: AwsProviderConfig[]
): AwsProviders {
  const providers: AwsProviders = {};
  for (const providerConfig of config) {
    providers[providerConfig.region] = new ProviderAWS(providerConfig.name, {
      region: <Region>providerConfig.region,
    });
  }

  return providers;
}
