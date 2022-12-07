import * as aws from "@pulumi/aws";
import { AuthorizationRule, Endpoint, NetworkAssociation } from "@pulumi/aws/ec2clientvpn";
import {
  AuthenticationOpts,
  ClientVpnConfig,
  ConnectionLogOpts,
  VpnAuthorizationConfig,
  VpnNetworkAssociation,
} from "./types";
import { Certificate } from "@pulumi/aws/acm";
import { createSamlProvider } from "../iam";
import { LogGroup, LogStream } from "@pulumi/aws/cloudwatch";

export function createAwsVpn(config: ClientVpnConfig, provider: aws.Provider): Endpoint {
  const logs = createLogResources(config.connection, provider);
  const certArn = createAwsCertificate(config.authentication, provider).arn;
  const samlProvider = createSamlProvider(config.authentication, provider);
  return new aws.ec2clientvpn.Endpoint(
    config.name,
    {
      description: config.description,
      serverCertificateArn: certArn,
      clientCidrBlock: config.cidrBlock,
      dnsServers: config.dnsServers,
      splitTunnel: config.splitTunnel,
      transportProtocol: config.transportProtocol,
      authenticationOptions: [
        {
          type: config.authentication.validationMethod,
          samlProviderArn: samlProvider.arn,
        },
      ],
      connectionLogOptions: {
        enabled: config.connection.enabled,
        cloudwatchLogGroup: logs.logGroup.name,
        cloudwatchLogStream: logs.logStream.name,
      },
    },
    { provider, deleteBeforeReplace: true }
  );
}

function createLogResources(
  config: ConnectionLogOpts,
  provider: aws.Provider
): {
  logGroup: LogGroup;
  logStream: LogStream;
} {
  const logGroup = new aws.cloudwatch.LogGroup(config.lg.name, {}, { provider });
  return {
    logGroup,
    logStream: new aws.cloudwatch.LogStream(config.ls.name, { logGroupName: logGroup.name }, { provider }),
  };
}

export function createAwsVpnAuthorizationRule(
  config: VpnAuthorizationConfig,
  provider: aws.Provider
): AuthorizationRule {
  return new aws.ec2clientvpn.AuthorizationRule(
    config.name,
    {
      clientVpnEndpointId: config.clientVpnEndpointId,
      targetNetworkCidr: config.targetNetworkCidr,
      authorizeAllGroups: true,
    },
    { provider }
  );
}

export function createAwsVpnNetworkAssociation(
  config: VpnNetworkAssociation,
  provider: aws.Provider
): NetworkAssociation {
  const na = new aws.ec2clientvpn.NetworkAssociation(
    config.name,
    {
      clientVpnEndpointId: config.clientVpnEndpointId,
      subnetId: config.subnetId,
    },
    { provider }
  );

  if (config.route) {
    new aws.ec2clientvpn.Route(
      `${config.name}-route`,
      {
        clientVpnEndpointId: config.clientVpnEndpointId,
        destinationCidrBlock: config.route.destinationCidrBlock,
        targetVpcSubnetId: config.subnetId,
      },
      { provider, dependsOn: na }
    );
  }

  return na;
}

export function createAwsCertificate(config: AuthenticationOpts, provider: aws.Provider): Certificate {
  return new aws.acm.Certificate(
    config.name,
    {
      domainName: config.domain,
      validationMethod: "DNS",
    },
    { provider }
  );
}
