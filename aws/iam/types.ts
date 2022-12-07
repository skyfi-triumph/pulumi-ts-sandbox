import { Output } from "@pulumi/pulumi";
import { GetPolicyDocumentArgs, OpenIdConnectProviderArgs, PolicyDocument } from "@pulumi/aws/iam";

export interface IamOutput {
  groups?: { [key: string]: Output<string> };
  users?: { [key: string]: Output<string> };
  roles?: { [key: string]: Output<string> };
  oidc?: { [key: string]: Output<string> };
  instanceprofile?: { [key: string]: Output<string> };
}

export interface Iam {
  groups?: IamGroup[];
  users?: IamUser[];
  roles?: IamRole[];
  oidc?: IamOidc[];
  instanceprofile?: IamInstanceProfile[];
}

export interface IamGroup {
  name: string;
  arns?: string[];
  policy?: PolicyDocument;
}

export interface IamUser {
  name: string;
  arns?: string[];
  policy?: GetPolicyDocumentArgs;
  groups?: string[];
}

export interface IamRole {
  name: string;
  arns?: string[];
  policy?: PolicyDocument;
  assumeRoleService?: string | string[];
  assumeRoleArns?: string[];
  inlinePolicies?: {
    name: string;
    policy: GetPolicyDocumentArgs;
  };
  maxSessionDuration?: number;
  k8sFederated?: { oidcArn: string; oidcUrl: string; serviceAccount: string };
}

export type IamOidc = OpenIdConnectProviderArgs & {
  name: string;
};

export type IamInstanceProfile = {
  name: string;
  role: string;
};
