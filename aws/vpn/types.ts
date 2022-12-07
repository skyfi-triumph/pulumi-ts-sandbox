export type AwsClientVpnConfig = {
  vpns?: ClientVpnConfig[];
  networkAssociations?: VpnNetworkAssociation[];
  authorizations?: VpnAuthorizationConfig[];
};

export type ClientVpnConfig = {
  name: string;
  description: string;
  dnsServers: [string];
  cidrBlock: string;
  authentication: AuthenticationOpts;
  connection: ConnectionLogOpts;
  region: string;
  splitTunnel: boolean;
  transportProtocol: string;
};

export type AuthenticationOpts = {
  name: string;
  domain: string;
  samlMetadata: string;
  validationMethod: string;
};

export type ConnectionLogOpts = {
  enabled: boolean;
  lg: { name: string };
  ls: { name: string };
};

export type VpnAuthorizationConfig = {
  name: string;
  region: string;
  clientVpnEndpointId: string;
  targetNetworkCidr: string;
};

export type VpnNetworkAssociation = {
  name: string;
  clientVpnEndpointId: string;
  subnetId: string;
  region: string;
  route?: VpnRoute;
};

export type VpnRoute = {
  destinationCidrBlock: string;
};
