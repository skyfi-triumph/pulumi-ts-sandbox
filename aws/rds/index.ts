import {
  AuroraClusterParams,
  AuroraCommonConfig,
  AuroraOutputConfig,
  AuroraParameterGroup,
  AuroraSecurityGroup,
  AuroraSubnetGroup,
} from "./types";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
// import { createIam } from "../iam";
// import { createSecret } from "../../secretsmanager";

export function createClusterParameterGroup(
  config: AuroraParameterGroup,
  provider: aws.Provider
): pulumi.Output<string> {
  if (!config.create) return pulumi.Output.create(config.name);

  const clusterParameterGroup: aws.rds.ClusterParameterGroup =
    new aws.rds.ClusterParameterGroup(
      `${config.name}-cpg`,
      {
        name: config.name,
        family: config.family,
        description: `Cluster parameter group for ${config.name}`,
        parameters: [
          {
            name: "rds.logical_replication",
            value: "1",
            applyMethod: "pending-reboot",
          },
          {
            name: "wal_sender_timeout",
            value: "0",
            applyMethod: "pending-reboot",
          },
          {
            name: "max_logical_replication_workers",
            value: "100",
            applyMethod: "pending-reboot",
          },
          {
            name: "max_worker_processes",
            value: "10",
            applyMethod: "pending-reboot",
          },
          {
            name: "shared_preload_libraries",
            value:
              "auto_explain,pgaudit,pg_similarity,pg_stat_statements,pg_hint_plan,pg_prewarm,plprofiler,pglogical,pg_cron",
            applyMethod: "pending-reboot",
          },
        ],
      },
      { provider }
    );

  return clusterParameterGroup.name;
}

export function createInstanceParameterGroup(
  config: AuroraParameterGroup,
  provider: aws.Provider
): pulumi.Output<string> {
  if (!config.create) return pulumi.Output.create(config.name);

  const instanceParameterGroup: aws.rds.ParameterGroup =
    new aws.rds.ParameterGroup(
      `${config.name}-pg`,
      {
        name: config.name,
        family: config.family,
        description: `Instance parameter group for ${config.name}`,
        parameters: [
          {
            name: "max_worker_processes",
            value: "10",
            applyMethod: "pending-reboot",
          },
          {
            name: "shared_preload_libraries",
            value:
              "auto_explain,pgaudit,pg_similarity,pg_stat_statements,pg_hint_plan,pg_prewarm,plprofiler,pglogical,pg_cron",
            applyMethod: "pending-reboot",
          },
        ],
      },
      { provider }
    );

  return instanceParameterGroup.name;
}

export function createSubnetGroup(
  config: AuroraSubnetGroup,
  provider: aws.Provider
): pulumi.Output<string> {
  if (!config.create) return pulumi.Output.create(config.name);
  const subnetGroup: aws.rds.SubnetGroup = new aws.rds.SubnetGroup(
    `${config.name}-subnet-group`,
    {
      name: config.name,
      description: `Subnet group for ${config.name}`,
      subnetIds: config.subnetIds,
    },
    { provider }
  );

  return subnetGroup.name;
}

export function createSecurityGroup(
  config: AuroraSecurityGroup,
  provider: aws.Provider
): pulumi.Output<string[]> {
  if (!config.create) return pulumi.Output.create(config.ids);

  const securityGroup: aws.ec2.SecurityGroup = new aws.ec2.SecurityGroup(
    `${config.name}-sg`,
    { ...config, tags: { Name: <string>config.name } },
    {
      provider,
      ignoreChanges: ["egress"],
    }
  );

  return securityGroup.id.apply((res) => [res]);
}

export async function createAuroraCluster(
  config: AuroraClusterParams,
  common: AuroraCommonConfig,
  provider: aws.Provider
): Promise<AuroraOutputConfig> {
  const rtnObj: AuroraOutputConfig = {};
  const clusterParameterGroup = { ...common.cluster.dbClusterParameterGroup };
  clusterParameterGroup.name = `${common.instance.dbParameterGroup.name}-${config.name}`;
  const clusterParameterGroupName: pulumi.Output<string> =
    createClusterParameterGroup(clusterParameterGroup, provider);

  const dbParameterGroup = { ...common.instance.dbParameterGroup };
  dbParameterGroup.name = `${common.instance.dbParameterGroup.name}-${config.name}`;
  const instanceParameterGroupName: pulumi.Output<string> =
    createInstanceParameterGroup(dbParameterGroup, provider);

  const cluster = config.dbConfig;
  cluster.clusterIdentifier = `${config.name}`;
  cluster.vpcSecurityGroup.name = `${config.name}-rds`;
  const securityGroups: pulumi.Output<string[]> = createSecurityGroup(
    { ...cluster.vpcSecurityGroup },
    provider
  );

  const fullClusterIdentifier = `${cluster.clusterIdentifier}-cluster`;
  const auroraCluster: aws.rds.Cluster = new aws.rds.Cluster(
    `${cluster.clusterIdentifier}`,
    {
      ...cluster,
      clusterIdentifier: `${config.name}`,
      dbClusterParameterGroupName: clusterParameterGroupName,
      engine: aws.rds.EngineType.AuroraPostgresql,
      serverlessv2ScalingConfiguration: cluster.serverlessv2ScalingConfiguration,
      vpcSecurityGroupIds: securityGroups,
      applyImmediately: true,
      tags: { ...common.cluster.tags, ...cluster.tags },
    },
    { provider, deleteBeforeReplace: true }
  );
  for (let i = 0; i < cluster.instances.count; i++) {
    new aws.rds.ClusterInstance(
      `${cluster.clusterIdentifier}-${i + 1}`,
      {
        ...cluster.instances,
        clusterIdentifier: auroraCluster.id,
        dbParameterGroupName: instanceParameterGroupName,
        dbSubnetGroupName: cluster.dbSubnetGroupName,
        identifier: `${cluster.clusterIdentifier}-${i + 1}`,
        instanceClass: cluster.instances.class,
        engine: auroraCluster.engine as pulumi.Output<aws.rds.EngineType>,
        engineVersion: auroraCluster.engineVersion,
        applyImmediately: true,
        tags: { ...common.instance.tags, ...cluster.instances.tags },
      },
      {
        provider,
        dependsOn: auroraCluster,
        ignoreChanges: ["engineVersion"],
        deleteBeforeReplace: false,
      }
    );
  }

//   const iamOutput = createIam(
//     {
//       roles: [
//         {
//           name: fullClusterIdentifier,
//           arns: ["arn:aws:iam::aws:policy/SecretsManagerReadWrite"],
//           assumeRoleService: [
//             "rds.amazonaws.com",
//             `dms.${config.region}.amazonaws.com`,
//           ],
//         },
//       ],
//     },
//     provider
//   );

//   auroraCluster.endpoint.apply((clusterEndpoint) => {
//     auroraCluster.readerEndpoint.apply((clusterReaderEndpoint) => {
//       auroraCluster.port.apply((clusterPort) => {
//         if (iamOutput.roles) {
//           if (cluster.secret.rds && cluster.secret.rds.create) {
//             createSecret(
//               {
//                 rds: {
//                   create: cluster.secret.rds.create,
//                   name: fullClusterIdentifier,
//                   username: cluster.masterUsername,
//                   password: cluster.masterPassword,
//                   engine: cluster.secret.rds.engine,
//                   host: clusterEndpoint,
//                   hostRo: clusterReaderEndpoint,
//                   port: clusterPort,
//                   dbname: cluster.databaseName as string,
//                   dbClusterIdentifier: fullClusterIdentifier,
//                   role: <string>(
//                     (<unknown>iamOutput.roles[fullClusterIdentifier])
//                   ),
//                 },
//               },
//               provider
//             ) as aws.secretsmanager.Secret;
//           }
//         }
//       });
//     });
//   });

//   rtnObj[fullClusterIdentifier] = Object.assign(
//     {},
//     rtnObj[cluster.clusterIdentifier],
//     {
//       read: auroraCluster.readerEndpoint,
//       write: auroraCluster.endpoint,
//     }
//   );
  return rtnObj;
}

// export async function createRdsInstance(
//   config: RDSInstanceParams,
//   common: RDSCommonConfig,
//   provider: aws.Provider
// ): Promise<RDSOutputConfig> {
//   const rtnObj: RDSOutputConfig = {};

//   const dbParameterGroup = { ...common.dbParameterGroup };
//   dbParameterGroup.name = `${common.dbParameterGroup.name}-${config.name}`;
//   const parameterGroupName: pulumi.Output<string> =
//     createInstanceParameterGroup(dbParameterGroup, provider);

//   const securityGroups: pulumi.Output<string[]> = createSecurityGroup(
//     { ...common.vpcSecurityGroup },
//     provider
//   );

//   const instance = new aws.rds.Instance(
//     `${config.name}`,
//     {
//       parameterGroupName,
//       ...config.dbConfig,
//       dbSubnetGroupName: config.dbConfig.dbSubnetGroupName,
//       identifier: `${config.name}`,
//       applyImmediately: true,
//       vpcSecurityGroupIds: securityGroups,
//       skipFinalSnapshot: true,
//       tags: { ...common.tags, ...config.dbConfig.tags },
//     },
//     { provider, ignoreChanges: ["engineVersion"], deleteBeforeReplace: true }
//   );

//   const iamOutput = createIam(
//     {
//       roles: [
//         {
//           name: `${config.name}-instance`,
//           arns: ["arn:aws:iam::aws:policy/SecretsManagerReadWrite"],
//           assumeRoleService: [
//             "rds.amazonaws.com",
//             `dms.${config.region}.amazonaws.com`,
//           ],
//         },
//       ],
//     },
//     provider
//   );

//   instance.endpoint.apply((endpoint) => {
//     instance.port.apply((clusterPort) => {
//       if (iamOutput.roles) {
//         if (config.dbConfig.secret.rds && config.dbConfig.secret.rds.create) {
//           createSecret(
//             {
//               instance: {
//                 create: config.dbConfig.secret.rds.create,
//                 name: `${config.name}`,
//                 username: config.dbConfig.username,
//                 password: config.dbConfig.password,
//                 engine: config.dbConfig.secret.rds.engine,
//                 host: endpoint,
//                 port: clusterPort,
//                 dbname: config.dbConfig.dbName as string,
//                 role: <string>(
//                   (<unknown>iamOutput.roles[`${config.name}-instance`])
//                 ),
//               },
//             },
//             provider
//           ) as aws.secretsmanager.Secret;
//         }
//       }
//     });
//   });

//   return rtnObj;

