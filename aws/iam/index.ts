import { Iam, IamGroup, IamInstanceProfile, IamOidc, IamOutput, IamRole, IamUser } from "./types";
import { Provider as ProviderAWS } from "@pulumi/aws/provider";
import {
  getPolicyDocument,
  Group,
  GroupPolicy,
  GroupPolicyAttachment,
  OpenIdConnectProvider,
  Policy,
  Role,
  RolePolicyAttachment,
  SamlProvider,
  User,
  UserGroupMembership,
  UserPolicy,
  UserPolicyAttachment,
  InstanceProfile,
} from "@pulumi/aws/iam";
import { AuthenticationOpts } from "../vpn/types";
import { Instance } from "@pulumi/aws/ec2";

function createGroup(config: IamGroup, provider: ProviderAWS): Group {
  const group = new Group(
    `${config.name}-group`,
    {
      name: `${config.name}`,
    },
    { provider }
  );

  if (!!config.arns && !!config.arns.length) {
    for (let i = 0; i < config.arns.length; i++) {
      new GroupPolicyAttachment(
        `${config.name}-group-policy-attachment-${i}`,
        {
          group: group.name,
          policyArn: config.arns[i],
        },
        { provider }
      );
    }
  }

  if (config.policy) {
    new GroupPolicy(
      `${config.name}-group-policy`,
      {
        name: `${config.name}`,
        group: group.name,
        policy: config.policy,
      },
      { provider }
    );
  }

  return group;
}

function createUser(config: IamUser, provider: ProviderAWS): User {
  const user = new User(
    `${config.name}-user`,
    {
      name: `${config.name}`,
      forceDestroy: true,
    },
    { provider }
  );

  if (!!config.arns && !!config.arns.length) {
    for (let i = 0; i < config.arns.length; i++) {
      new UserPolicyAttachment(
        `${config.name}-user-policy-attachment-${i}`,
        {
          user: user.name,
          policyArn: config.arns[i],
        },
        { provider }
      );
    }
  }

  if (config.policy) {
    new UserPolicy(
      `${config.name}-user-policy`,
      {
        name: `${config.name}`,
        user: user.name,
        policy: getPolicyDocument({ statements: config.policy.statements }).then((doc) => doc.json),
      },
      { provider }
    );
  }

  if (!!config.groups && !!config.groups.length) {
    new UserGroupMembership(
      `${config.name}-user-group-membership`,
      {
        groups: config.groups,
        user: user.name,
      },
      { provider }
    );
  }

  return user;
}
function createInstanceProfile(config: IamInstanceProfile, provider: ProviderAWS): InstanceProfile {
  const instanceProfile = new InstanceProfile("InstanceProfile", {
    role: `${config.role}`,
    name: config.name,
  });
  return instanceProfile;
}

function createRole(config: IamRole, provider: ProviderAWS): Role {
  const assumePrincipals = [];
  if (config.assumeRoleService) {
    assumePrincipals.push({
      type: "Service",
      identifiers: Array.isArray(config.assumeRoleService) ? config.assumeRoleService : [config.assumeRoleService],
    });
  }

  if (config.assumeRoleArns) {
    assumePrincipals.push({ type: "AWS", identifiers: config.assumeRoleArns });
  }

  const role: Role = new Role(
    `${config.name}-role`,
    {
      name: `${config.name}-role`,
      assumeRolePolicy: config.k8sFederated
        ? getPolicyDocument({
            statements: [
              {
                sid: "",
                effect: "Allow",
                actions: ["sts:AssumeRoleWithWebIdentity"],
                principals: [{ type: "Federated", identifiers: [config.k8sFederated.oidcArn] }],
                conditions: [
                  {
                    test: "StringEquals",
                    values: [config.k8sFederated.serviceAccount],
                    variable: `${config.k8sFederated.oidcUrl}:sub`,
                  },
                  {
                    test: "StringEquals",
                    values: ["sts.amazonaws.com"],
                    variable: `${config.k8sFederated.oidcUrl}:aud`,
                  },
                ],
              },
            ],
          }).then((doc) => doc.json)
        : getPolicyDocument({
            statements: [
              {
                sid: "",
                effect: "Allow",
                actions: ["sts:AssumeRole"],
                principals: assumePrincipals,
              },
            ],
          }).then((doc) => doc.json),
      forceDetachPolicies: true,
      inlinePolicies: config.inlinePolicies
        ? [
            getPolicyDocument({
              statements: config.inlinePolicies.policy.statements,
            }).then((doc) => {
              return { name: config.inlinePolicies?.name, policy: doc.json };
            }),
          ]
        : [],
      managedPolicyArns: config.arns || [],
      maxSessionDuration: config.maxSessionDuration || 60 * 60 * 12,
    },
    { provider }
  );

  if (config.policy) {
    const policy: Policy = new Policy(
      `${config.name}-policy`,
      {
        name: `${config.name}-policy`,
        policy: config.policy,
      },
      { provider }
    );

    new RolePolicyAttachment(
      `${config.name}-policy-attachment`,
      {
        role: role.name,
        policyArn: policy.arn,
      },
      { provider }
    );
  }
  return role;
}

export function CreateOidcProvider(config: IamOidc, provider: ProviderAWS): OpenIdConnectProvider {
  return new OpenIdConnectProvider(
    `${config.name}-oidc-provider`,
    {
      ...config,
      tags: { ...config.tags, Name: config.name },
    },
    { provider }
  );
}

export function createIam(config: Iam, provider: ProviderAWS): IamOutput {
  const rtnObj = <IamOutput>{};

  if (config.groups) {
    rtnObj.groups = {};
    for (const group of config.groups) {
      rtnObj.groups[group.name] = createGroup(group, provider).arn;
    }
  }

  if (config.users) {
    rtnObj.users = {};
    for (const user of config.users) {
      rtnObj.users[user.name] = createUser(user, provider).arn;
    }
  }

  if (config.roles) {
    rtnObj.roles = {};
    for (const role of config.roles) {
      rtnObj.roles[role.name] = createRole(role, provider).arn;
    }
  }

  if (config.oidc) {
    rtnObj.oidc = {};
    for (const oidc of config.oidc) {
      rtnObj.oidc[oidc.name] = CreateOidcProvider(oidc, provider).arn;
    }
  }

  if (config.instanceprofile) {
    rtnObj.instanceprofile = {};
    for (const instanceprofile of config.instanceprofile) {
      rtnObj.instanceprofile[instanceprofile.name] = createInstanceProfile(instanceprofile, provider).arn;
    }
  }
  return rtnObj;
}

export function createSamlProvider(config: AuthenticationOpts, provider: ProviderAWS) {
  return new SamlProvider(config.name, { samlMetadataDocument: config.samlMetadata }, { provider });
}
