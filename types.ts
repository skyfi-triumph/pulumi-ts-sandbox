
import { Provider as ProviderAWS } from "@pulumi/aws";


export type ProviderConfig = {
  aws?: AwsProviderConfig[];
};

export type Providers = {
  aws?: AwsProviders;
};

export type AwsProviderConfig = {
  name: string;
  region: string;
};

export type AwsProviders = {
  [region: string]: ProviderAWS;
};

