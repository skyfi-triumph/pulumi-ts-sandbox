import {
  NatGatewayArgs,
  RouteArgs,
  RouteTableArgs,
  SubnetArgs,
  VpcArgs,
  VpcEndpointArgs,
} from "@pulumi/aws/ec2";

export type VpcConfig = {
  name: string;
  region: string;
  data: VpcArgs;
  subnets?: SubnetConfig[];
  createNatGateway?: boolean;
  createRouteTables?: boolean;
};
export type SubnetConfig = SubnetArgs & {
  name?: string;
  type: string;
};
export type NatGatewayConfig = NatGatewayArgs & {
  name: string;
};
export type RouteTableConfig = RouteTableArgs & {
  name?: string;
};
export type VpcEndpointConfig = VpcEndpointArgs & {
  name: string;
  region?: string;
};
export type VpcRouteConfig = {
  name: string;
  peerId: string;
  region: string;
  routes: RouteArgs[];
};
export interface AwsVpcConfig {
  endpoints?: VpcEndpointConfig[];
  routes?: VpcRouteConfig[];
  vpcs?: VpcConfig[];
}
