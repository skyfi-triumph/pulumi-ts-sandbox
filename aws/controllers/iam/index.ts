import { Provider as ProviderAWS } from "@pulumi/aws/provider";
import { Iam, IamOutput } from "../../iam/types";
import { createIam } from "../../iam";

export function Init(iamConfig: Iam, provider: ProviderAWS): IamOutput {
  return createIam(iamConfig, provider);
}
