import { createRepository } from "../../ecr";
import { Provider as ProviderAWS } from "@pulumi/aws/provider";

export function Init(repositories: string, provider: ProviderAWS) {
  const urls = [];
  for (const repo of repositories) {
    urls.push(createRepository(repo, provider));
  }

  return urls;
}
