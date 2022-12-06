
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export type Types = {
  clusters?: { [name: string]: AuroraClusterParams };
  instances?: { [name: string]: RDSInstanceParams };
  auroraCommon: AuroraCommonConfig;
  auroraDefaults: AuroraDefaultConfig;
};

export type AuroraClusterParams = {
  name: string;
  region: string;
  dbConfig: AuroraClusterConfig;
  serverlessv2ScalingConfiguration: serverlessv2ScalingConfigurationArgs;
};

export type AuroraOutputConfig = {
  [key: string]: AuroraClusterOutputConfig;
};

export type AuroraSecurityGroup = aws.ec2.SecurityGroupArgs & {
  create?: boolean;
  ids: string[];
};

interface AuroraClusterOutputConfig {
  read?: string | pulumi.Output<string>;
  write?: string | pulumi.Output<string>;
}

export interface AuroraCommonConfig {
  cluster: AuroraCommonClusterConfig;
  instance: AuroraCommonInstanceConfig;
  subnetGroups: AuroraSubnetGroup[];
}

interface AuroraCommonClusterConfig {
  dbClusterParameterGroup: AuroraParameterGroup;
  tags?: { [k: string]: string };
}

interface AuroraCommonInstanceConfig {
  dbParameterGroup: AuroraParameterGroup;
  tags?: { [k: string]: string };
}

export interface AuroraDefaultConfig {
  cluster: AuroraClusterConfig;
  instance: AuroraInstanceConfig;
  secret: SecretManager;
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
  engineMode: string;
  engineVersion: string;
  instances: AuroraInstanceConfig;
  masterUsername: string;
  masterPassword: string;
  region: string;
  serverlessv2ScalingConfiguration: serverlessv2ScalingConfigurationArgs;
  skipFinalSnapshot?: boolean;
  storageEncrypted?: boolean;
  vpcSecurityGroup: AuroraSecurityGroup;

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
  tags?: { [k: string]: string };
}

export interface AuroraParameterGroup {
  create?: boolean;
  name: string;
  family: string;
}

export interface AuroraSubnetGroup {
  create?: boolean;
  name: string;
  region: string;
  subnetIds: string[];
}

interface serverlessv2ScalingConfigurationArgs {
  maxCapacity: number;
  minCapacity: number;
}