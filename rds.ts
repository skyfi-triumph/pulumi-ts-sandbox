import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
// import { SecretManager, createSecret } from "./secretsmanager";
// import { createIam } from "./aws/iam";

export type AuroraConfig = {
  clusters: {
    [name: string]: {
      [env: string]: AuroraClusterConfig;
    };
  };
  common: AuroraCommonConfig;
  defaults: AuroraDefaultConfig;
};

type AuroraOutputConfig = {
  [key: string]: AuroraClusterOutputConfig;
};

interface AuroraClusterOutputConfig {
  read?: string | pulumi.Output<string>;
  write?: string | pulumi.Output<string>;
}

interface AuroraCommonConfig {
  cluster: AuroraCommonClusterConfig;
  instance: AuroraCommonInstanceConfig;
  subnetGroups: AuroraSubnetGroup[];
}

interface AuroraCommonClusterConfig {
  tags?: { [k: string]: string };
  dbClusterParameterGroup: AuroraParameterGroup;
}

interface AuroraCommonInstanceConfig {
  dbParameterGroup: AuroraParameterGroup;
}

interface AuroraDefaultConfig {
  cluster: AuroraClusterConfig;
  instance: AuroraInstanceConfig;
}

interface AuroraClusterConfig {
  allowMajorVersionUpgrade: boolean;
  availabilityZones?: string[];
  backupRetentionPeriod?: number;
  clusterIdentifier: string;
  databaseName?: string;
  dbClusterParameterGroupName?: string;
  dbSubnetGroupName?: string;
  enabledCloudwatchLogsExports?: string[];
  engine: "aurora" | "aurora-mysql" | "aurora-postgresql";
  engineVersion: string;
  instances: AuroraInstanceConfig;
  masterUsername: string;
  masterPassword: string;
  region: string;
  skipFinalSnapshot?: boolean;
  storageEncrypted?: boolean;
  vpcSecurityGroup: AuroraSecurityGroup;
  //   secret: SecretManager;
  tags?: { [k: string]: string };
}

interface AuroraInstanceConfig {
  autoMinorVersionUpgrade: boolean;
  class: string;
  count: number;
  monitoringRoleArn: string;
  monitoringInterval: number;
  performanceInsightsEnabled: boolean;
  publiclyAccessible: boolean;
}

interface AuroraParameterGroup {
  create?: boolean;
  name: string;
  family: string;
}

interface AuroraSubnetGroup {
  create?: boolean;
  name: string;
  subnetIds: string[];
}

interface serverlessv2ScalingConfigurationArgs {
  maxCapacity: number;
  minCapacity: number;
}

type AuroraSecurityGroup = aws.ec2.SecurityGroupArgs & {
  create?: boolean;
  ids: string[];
};

function createClusterParameterGroup(
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
          { name: "rds.logical_replication", value: "1" },
          { name: "wal_sender_timeout", value: "0" },
          { name: "max_logical_replication_workers", value: "100" },
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

function createInstanceParameterGroup(
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
              "auto_explain, pgaudit, pg_similarity, pg_stat_statements, pg_hint_plan, pg_prewarm, plprofiler, pglogical, pg_cron",
            applyMethod: "pending-reboot",
          },
        ],
      },
      { provider }
    );

  return instanceParameterGroup.name;
}

function createSubnetGroup(
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

function createSecurityGroup(
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
  config: AuroraConfig,
  provider: aws.Provider
): Promise<AuroraOutputConfig> {
  const rtnObj: AuroraOutputConfig = {};
  const clusterParameterGroupName: pulumi.Output<string> =
    createClusterParameterGroup(
      config.common.cluster.dbClusterParameterGroup,
      provider
    );
  const instanceParameterGroupName: pulumi.Output<string> =
    createInstanceParameterGroup(
      config.common.instance.dbParameterGroup,
      provider
    );
  const subnetGroups = [];
  for (const subnetGroup of config.common.subnetGroups) {
    subnetGroups.push(createSubnetGroup(subnetGroup, provider));
  }

  for (const service in config.clusters) {
    for (const env in config.clusters[service]) {
      const cluster = config.clusters[service][env];
      cluster.clusterIdentifier = `${service}-${env}-rds`;
      config.defaults.cluster.vpcSecurityGroup.name = `${service}-${env}-rds`;

      const securityGroups: pulumi.Output<string[]> = createSecurityGroup(
        {
          ...config.defaults.cluster.vpcSecurityGroup,
          ...cluster.vpcSecurityGroup,
        },
        provider
      );
      const fullClusterIdentifier = `${cluster.clusterIdentifier}-cluster`;

      const auroraCluster: aws.rds.Cluster = new aws.rds.Cluster(
        `${cluster.clusterIdentifier}-cluster`,
        {
          allowMajorVersionUpgrade:
            cluster.allowMajorVersionUpgrade ||
            config.defaults.cluster.allowMajorVersionUpgrade,
          availabilityZones:
            cluster.availabilityZones ||
            config.defaults.cluster.availabilityZones,
          backupRetentionPeriod:
            cluster.backupRetentionPeriod ||
            config.defaults.cluster.backupRetentionPeriod,
          clusterIdentifier: fullClusterIdentifier,
          databaseName: cluster.databaseName,
          dbClusterParameterGroupName: clusterParameterGroupName,
          dbSubnetGroupName:
            cluster.dbSubnetGroupName ||
            config.defaults.cluster.dbSubnetGroupName,
          enabledCloudwatchLogsExports:
            cluster.enabledCloudwatchLogsExports ||
            config.defaults.cluster.enabledCloudwatchLogsExports,
          engine: aws.rds.EngineType.AuroraPostgresql,
          engineVersion:
            cluster.engineVersion || config.defaults.cluster.engineVersion,
          masterUsername: cluster.masterUsername,
          masterPassword: cluster.masterPassword,
          skipFinalSnapshot:
            cluster.skipFinalSnapshot ||
            config.defaults.cluster.skipFinalSnapshot,
          storageEncrypted:
            cluster.storageEncrypted ||
            config.defaults.cluster.storageEncrypted,
          vpcSecurityGroupIds: securityGroups,
          applyImmediately: true,
          tags: { ...config.common.cluster.tags, ...cluster.tags },
        },
        { provider, deleteBeforeReplace: true }
      );

      for (let i = 0; i < cluster.instances.count; i++) {
        new aws.rds.ClusterInstance(
          `${cluster.clusterIdentifier}-${i + 1}`,
          {
            autoMinorVersionUpgrade:
              cluster.instances.autoMinorVersionUpgrade ||
              config.defaults.instance.autoMinorVersionUpgrade,
            clusterIdentifier: auroraCluster.id,
            dbParameterGroupName: instanceParameterGroupName,
            dbSubnetGroupName:
              cluster.dbSubnetGroupName ||
              config.defaults.cluster.dbSubnetGroupName,
            identifier: `${cluster.clusterIdentifier}-${i + 1}`,
            instanceClass:
              cluster.instances.class || config.defaults.instance.class,
            engine: auroraCluster.engine as pulumi.Output<aws.rds.EngineType>,
            engineVersion: auroraCluster.engineVersion,
            monitoringInterval:
              cluster.instances.monitoringInterval ||
              config.defaults.instance.monitoringInterval,
            monitoringRoleArn:
              cluster.instances.monitoringRoleArn ||
              config.defaults.instance.monitoringRoleArn,
            performanceInsightsEnabled:
              cluster.instances.performanceInsightsEnabled ||
              config.defaults.instance.performanceInsightsEnabled,
            publiclyAccessible:
              cluster.instances.publiclyAccessible ||
              config.defaults.instance.publiclyAccessible,
            applyImmediately: true,
          },
          {
            provider,
            dependsOn: auroraCluster,
            ignoreChanges: ["engineVersion"],
            deleteBeforeReplace: true,
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
      //             "dms.us-east-1.amazonaws.com",
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
    }
  }
  return rtnObj;
}