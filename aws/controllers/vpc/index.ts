import { AwsVpcConfig } from "../../vpc/types";
import { AwsProviders } from "../../../types";
import { Output } from "@pulumi/pulumi";
import { createVpc, createVpcRoutes } from "../../vpc";

export function Init(stackVpcConfig: AwsVpcConfig, providers: AwsProviders) {
  const rtnObj: { vpcs: Output<string>[] } = {
    vpcs: [],
  };

  if (stackVpcConfig.vpcs) {
    for (const vpcConfig of stackVpcConfig.vpcs) {
      rtnObj.vpcs.push(createVpc(vpcConfig, providers[vpcConfig.region]).id);
    }
  }
  if (stackVpcConfig.routes) {
    for (const route of stackVpcConfig.routes) {
      createVpcRoutes(route, providers[route.region]);
    }
  }

  return rtnObj;
}
