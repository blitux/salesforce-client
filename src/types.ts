export type SalesforceConfig = {
  iss: string;
  sub: string;
  aud: string;
  key: string;
  expMinutes: number;
};

export type InternalConfig = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
};
