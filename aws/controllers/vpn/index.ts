import { AwsClientVpnConfig } from "../../vpn/types";
import { createAwsVpn, createAwsVpnAuthorizationRule, createAwsVpnNetworkAssociation } from "../../vpn";
import { AwsProviders } from "../../../types";
import { AuthorizationRule, NetworkAssociation } from "@pulumi/aws/ec2clientvpn";
import { Output } from "@pulumi/pulumi";

export function Init(stackVpnConfig: 12, providers: AwsProviders) {
  const rtnObj: {
    vpns: Output<string>[];
    networkAssociations: NetworkAssociation[];
    authorizations: AuthorizationRule[];
  } = {
    vpns: [],
    networkAssociations: [],
    authorizations: [],
  };

  if (stackVpnConfig.vpns) {
    for (const vpnConfig of stackVpnConfig.vpns) {
      rtnObj.vpns.push(createAwsVpn(vpnConfig, providers[vpnConfig.region]).id);
    }
  }
  if (stackVpnConfig.networkAssociations) {
    for (const networkAssociationConfig of stackVpnConfig.networkAssociations) {
      rtnObj.networkAssociations.push(
        createAwsVpnNetworkAssociation(networkAssociationConfig, providers[networkAssociationConfig.region])
      );
    }
  }
  if (stackVpnConfig.authorizations) {
    for (const authorizationRule of stackVpnConfig.authorizations) {
      rtnObj.authorizations.push(createAwsVpnAuthorizationRule(authorizationRule, providers[authorizationRule.region]));
    }
  }
  return rtnObj;
}
