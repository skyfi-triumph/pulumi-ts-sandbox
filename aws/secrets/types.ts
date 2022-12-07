export interface SecretManager {
  rds?: AuroraSecret;
  json?: JsonSecret;
}

export type JsonSecret = {
  data: { [k: string]: string };
  name: string;
};

export interface AuroraSecret {
  create?: boolean;
  name: string;
  username: string;
  password: string;
  engine: string;
  host: string;
  hostRo: string;
  port: number;
  dbname: string;
  dbClusterIdentifier: string;
  role?: string;
}