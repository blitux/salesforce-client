export type JWTHeader = {
  alg: "RS256";
};

export interface TokenOptions {
  iss: string;
  sub: string;
  aud: string;
  privateKey: string;
}

export interface TokenOutput {
  access_token: string;
  scope: string;
  instance_url: string;
  id: string;
  token_type: string;
}

export type TokenConfig = Omit<TokenOptions, "privateKey">;
