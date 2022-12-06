import { Provider as ProviderAWS } from "@pulumi/aws";
import {
  Eip,
  InternetGateway,
  NatGateway,
  Route,
  RouteTable,
  RouteTableAssociation,
  Subnet,
  Vpc,
  VpcEndpoint,
} from "@pulumi/aws/ec2";
import {
  NatGatewayConfig,
  RouteTableConfig,
  SubnetConfig,
  VpcConfig,
  VpcEndpointConfig,
  VpcRouteConfig,
} from "./types";

function createVpcEndpoint(
  config: VpcEndpointConfig,
  provider: ProviderAWS
): VpcEndpoint {
  return new VpcEndpoint(`${config.name}-VpcEndpoint`, config, { provider });
}

export function createVpcRoutes(config: VpcRouteConfig, provider: ProviderAWS) {
  for (let i = 0; i < config.routes.length; i++) {
    new Route(
      `${config.name}-route-${i}`,
      {
        routeTableId: config.routes[i].routeTableId,
        destinationCidrBlock: config.routes[i].destinationCidrBlock
      },
      { provider }
    );
  }
}

export function createVpc(config: VpcConfig, provider: ProviderAWS): Vpc {
  config.data.tags = { ...config.data.tags, Name: config.name };
  const vpc = new Vpc(`${config.name}-vpc`, config.data, { provider });
  const igw = new InternetGateway(
    `${config.name}-igw`,
    { vpcId: vpc.id, tags: { Name: config.name } },
    { provider }
  );

  const publicSubnets = <Subnet[]>[];
  const privateSubnets = <Subnet[]>[];
  if (config.subnets?.length) {
    config.subnets = config.subnets.map((subnet) => {
      subnet.name =
        subnet.name ||
        `${config.name}-${subnet.type}-${subnet.availabilityZone}`;
      return {
        ...subnet,
        tags: {
          ...subnet.tags,
          Name: subnet.name,
          Type: subnet.type,
        },
        vpcId: vpc.id,
      };
    });

    for (const subnetConfig of config.subnets) {
      if (subnetConfig.type === "public") {
        publicSubnets.push(createSubnet(subnetConfig, provider));
      } else if (subnetConfig.type === "private") {
        privateSubnets.push(createSubnet(subnetConfig, provider));
      }
    }
  }

  let natGateway = <NatGateway>{};
  if (config.createNatGateway) {
    const eip = new Eip(
      `${config.name}-eip`,
      { vpc: true, publicIpv4Pool: "amazon", tags: { Name: config.name } },
      { provider }
    );

    const natGatewayConfig: NatGatewayConfig = {
      name: `${config.name}-nat-gateway`,
      allocationId: eip.id,
      subnetId: publicSubnets[0].id,
      tags: {
        Name: `${config.name}-nat-gateway`,
      },
    };

    natGateway = createNatGateway(natGatewayConfig, provider);
  }

  if (config.createRouteTables) {
    const publicRt = createRouteTable(
      {
        name: `${config.name}-public-rt`,
        routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
        tags: { Name: `${config.name}-public-rt` },
        vpcId: vpc.id,
      },
      provider
    );

    for (let i = 0; i < publicSubnets.length; i++) {
      const subnet = publicSubnets[i];
      new RouteTableAssociation(`${config.name}-public-subnet-${i}-rta`, {
        routeTableId: publicRt.id,
        subnetId: subnet.id,
      });
    }

    let privateRt = <RouteTable>{};
    if (config.createNatGateway) {
      privateRt = createRouteTable(
        {
          name: `${config.name}-private-rt`,
          routes: [{ cidrBlock: "0.0.0.0/0", natGatewayId: natGateway.id }],
          tags: { Name: `${config.name}-private-rt` },
          vpcId: vpc.id,
        },
        provider
      );
    } else {
      privateRt = createRouteTable(
        {
          name: `${config.name}-private-rt`,
          routes: [{ cidrBlock: vpc.cidrBlock, gatewayId: vpc.id }],
          tags: { Name: `${config.name}-private-rt` },
          vpcId: vpc.id,
        },
        provider
      );
    }

    for (let i = 0; i < privateSubnets.length; i++) {
      const subnet = privateSubnets[i];
      new RouteTableAssociation(`${config.name}-private-subnet-${i}-rta`, {
        routeTableId: privateRt.id,
        subnetId: subnet.id,
      });
    }
  }

  return vpc;
}

function createSubnet(config: SubnetConfig, provider: ProviderAWS): Subnet {
  return new Subnet(<string>config.name, config, { provider });
}

function createNatGateway(
  config: NatGatewayConfig,
  provider: ProviderAWS
): NatGateway {
  return new NatGateway(<string>config.name, config, { provider });
}

function createRouteTable(
  config: RouteTableConfig,
  provider: ProviderAWS
): RouteTable {
  return new RouteTable(<string>config.name, config, { provider });
}
