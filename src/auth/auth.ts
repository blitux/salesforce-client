import crypto from "node:crypto";
import { HTTPError, type Options } from "ky";
import { type HttpClient, httpClient } from "src/http-client.js";
import type { InternalConfig, SalesforceConfig } from "src/types.js";
import { memoizeAsync } from "src/util.js";
import {
  SalesforceParameterValidationException,
  SalesforceSignatureException,
  SalesforceTokenRequestException,
  SalesforceTokenResponseException,
} from "./errors.js";
import type { TokenOutput } from "./types.js";

type Crypto = typeof import("node:crypto");

const EXP_DEFAULT_MINUTES = 30;
const SALESFORCE_TOKEN_GRANT_TYPE =
  "urn:ietf:params:oauth:grant-type:jwt-bearer";
const SALESFORCE_TOKEN_ENDPOINT = "services/oauth2/token";

const realGetToken =
  (httpClient: HttpClient, crypto: Crypto) =>
  async (config: SalesforceConfig): Promise<TokenOutput> => {
    const validConfig = validateConfig(config);
    const base64Config = toBase64url(stringify(validConfig));
    const jwt = composeJWT(base64Config);
    const assertion = getAssertion(crypto)(config.key)(jwt);
    const tokenOutput = await makeTokenRequest(httpClient)(config.aud)(
      assertion,
    );
    if (!hasAccessToken(tokenOutput)) {
      throw new SalesforceTokenResponseException(
        "Token response does not contain access_token value",
      );
    }

    return tokenOutput;
  };

export const createGetToken = (deps: {
  httpClient: HttpClient;
  crypto: Crypto;
}) => {
  const getTokenFn = realGetToken(deps.httpClient, deps.crypto);
  return memoizeAsync(getTokenFn, {
    getTTL: (config) => (config.expMinutes - 1) * 60 * 1000,
  });
};

export const getToken = createGetToken({ httpClient, crypto });

const validateConfig = (config: SalesforceConfig): InternalConfig => {
  const { iss, sub, aud } = config;
  const requiredParams: Record<string, unknown> = { iss, sub, aud };
  const missingParams = Object.entries(requiredParams)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingParams.length) {
    throw new SalesforceParameterValidationException(
      `Missing required payload properties: ${missingParams.join(", ")}`,
    );
  }

  return {
    iss,
    sub,
    aud,
    exp: getTimestampMinutesFromNow(config.expMinutes ?? EXP_DEFAULT_MINUTES),
  };
};

const stringify = (
  config: Record<string, unknown>,
  readable?: boolean,
): string => {
  try {
    return JSON.stringify(config, null, readable ? 2 : undefined);
  } catch (e) {
    const err = e as Error;
    throw new Error("Unable to stringify config, check values");
  }
};

const toBase64url = (value: string) => {
  return Buffer.from(value).toString("base64url");
};

const composeJWT = (payload: string): string => {
  const header = toBase64url(stringify({ alg: "RS256" }));
  return `${header}.${payload}`;
};

const getAssertion =
  (crypto: Crypto) =>
  (privateKey: string) =>
  (jwt: string): string => {
    try {
      const sign = crypto.createSign("RSA-SHA256");
      sign.update(jwt);
      const signature = sign.sign(privateKey, "base64url");
      return `${jwt}.${signature}`;
    } catch (e) {
      const err = e as Error;
      throw new SalesforceSignatureException(
        `Unable to sign JWT: ${err.message}. Check key validity.`,
      );
    }
  };

const makeTokenRequest =
  (httpClient: HttpClient) =>
  (baseUrl: string) =>
  async (assertion: string): Promise<TokenOutput> => {
    try {
      const reqOptions = buildTokenRequest(assertion);
      const res = await httpClient(baseUrl).post(
        SALESFORCE_TOKEN_ENDPOINT,
        reqOptions,
      );
      const json = await res.json<TokenOutput>();
      return json;
    } catch (err) {
      if (err instanceof HTTPError) {
        const data = await err.response.json();
        throw new SalesforceTokenRequestException(
          `Token request failed: ${err.message}, data: ${stringify(data, true)}`,
        );
      }
      throw err;
    }
  };

const buildTokenRequest = (assertion: string): Options => {
  const body = new URLSearchParams();
  body.set("grant_type", SALESFORCE_TOKEN_GRANT_TYPE);
  body.set("assertion", assertion);
  return {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
};

const hasAccessToken = (data: unknown): data is { access_token: unknown } =>
  typeof data === "object" && data !== null && "access_token" in data;

const getTimestampMinutesFromNow = (minutes: number) =>
  Math.floor(Date.now() / 1000) + 60 * minutes;
