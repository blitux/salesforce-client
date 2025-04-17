import ky, { type KyInstance, type Options } from "ky";

export type HttpClient = (baseUrl?: string) => KyInstance;

export const httpClient: HttpClient = (baseUrl?: string) => {
  const config: Options = {};

  if (baseUrl) {
    config.prefixUrl = baseUrl;
  }

  return ky.create(config);
};
