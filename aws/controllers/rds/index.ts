import { AuroraOutputConfig, Types } from "../../rds/types";
import { AwsProviders } from "../../../types";
import * as pulumi from "@pulumi/pulumi";
import {
  createAuroraCluster,
  createSubnetGroup,
} from "../../rds";

export function Init(
  rdsConfig: Types,
  providers: AwsProviders
): { clusters: Promise<AuroraOutputConfig>[] } {
  const rtnObj: {
    clusters: Promise<AuroraOutputConfig>[];
  } = {
    clusters: [],
  };
  const subnetGroups: { [name: string]: pulumi.Output<string> } = {};
  for (const subnetConfig of rdsConfig.auroraCommon.subnetGroups) {
    subnetGroups[subnetConfig.name] = createSubnetGroup(
      subnetConfig,
      providers[subnetConfig.region]
    );
  }
  if (rdsConfig.clusters) {
    for (const auroraConfig in rdsConfig.clusters) {
      const cluster = rdsConfig.clusters[auroraConfig];
      rtnObj.clusters.push(
        createAuroraCluster(
          {
            name: cluster.name,
            region: cluster.region,
            dbConfig: {
              ...rdsConfig.auroraDefaults.cluster,
              ...cluster.dbConfig,
              instances: {
                ...rdsConfig.auroraDefaults.instance,
                ...cluster.dbConfig.instances,
              },
            },
          },
          rdsConfig.auroraCommon,
          providers[cluster.region]
        )
      );
    }
  }

  return rtnObj;
}
