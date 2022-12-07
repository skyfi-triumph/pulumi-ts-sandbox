# pulumi-ts-sandbox

Pulumi Typescript code for sandbox with VPC, RDS, ECR, IAM, S3, and Secrets

## Pulumi Command Examples

- Setup AWS Credentials in terminal

    ```
    vim ~/.aws/credentials
    ```
    
    Copy credentials from SSO Landing Page, or enter access key creds from IAM

    ```
    [sandbox]
    aws_access_key_id=ASIA47MSSSSSSSSSSSSSSSS
    aws_secret_access_key=x6LSfvRjieVJySSSSSSSSSSSSSSSS
    aws_session_token=IQoJbSSSSSSSSSSSSSSSS///////////wEaCXVzLWVhc3QtMSJHMEUCIQDmjst0uqu6FXNEL/o5NveNK4eJd7FtRjeeofU7P/5r8gIgSSSSSSSSSSSSSSSS6X4K5s6qtLjw3KTy85Sgkz0DyUIkqnwMIqP//////////ARAAGgw4OTIwSSSSSSSSSSSSSSSSAlsreirzAgScj6N20lXSGooxBy2wzGlATIwuFY/THttNkCVZEXs1GjaVxfVrt7WYCLAuCh8s5rTlYmSSSSSSSSSSSSSSSSHXEXDtSL/yG/1ySSSSSSSSSSSSSSSSPjkMuyguLhWRpDAwNNR==
    region = us-east-1
    output = table
    ```

- Export credentials

    ```
    export AWS_PROFILE=sandbox
    ```

- Login into Pulumi backend

    ```
    pulumi login s3://company-dev-infra
    ```

- List Pulumi stacks

    ```
    pulumi stack ls
    ```

- Select Pulumi stack to deploy (cd to directory variable file is stored)

    ```
    pulumi stack select sandbox-rds
    ```

- Show Pulumi stack outputs

    ```
    pulumi stack output --json
    ```

- Apply Pulumi stack changes (displays preview of deploy for confirmation before deploying)

    ```
    pulumi up --config-file Pulumi.sandbox-rds.yaml
    ```

## Set Secret Password in Pulumi .yaml file

```
export AWS_PROFILE=sandbox
pulumi login s3://company-dev-infra
pulumi stack select sandbox-rds
pulumi config set --path 'stack:data[0].adminPassword' --secret ‘TopSecretPassword!’ --config-file stacks/sandbox/Pulumi.sandbox-rds.yaml
pulumi up --config-file ./stacks/sandbox/Pulumi.sandbox-rds.yaml
```

## Start a New Pulumi Stack

```
cd controllers
pulumi login s3://company-dev-infra
pulumi stack init dev-ecr
pulumi stack select dev-ecr
cd ../../stacks/dev
pulumi up --config-file Pulumi.dev-ecr.yaml
```
