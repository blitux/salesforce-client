import * as crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HTTPError, type NormalizedOptions } from "ky";
import type { HttpClient } from "src/http-client.js";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import { createGetToken, getToken } from "../../auth/auth.js";
import {
  SalesforceParameterValidationException,
  SalesforceSignatureException,
  SalesforceTokenRequestException,
  SalesforceTokenResponseException,
} from "../../auth/errors.js";

const VALID_KEY = fs.readFileSync(path.join(__dirname, "./pk.pem"), "utf8");
const BASE_URL = "https://example.salesforce.com";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth", () => {
  it("gets token successfully", async () => {
    const validConfig = {
      iss: "abc",
      sub: "def",
      aud: BASE_URL,
      key: VALID_KEY,
      expMinutes: 30,
    };

    const mockClient = vi.fn(() => ({
      post: vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ access_token: "abc123" })),
        ),
    })) as unknown as HttpClient;

    const getToken = createGetToken({ httpClient: mockClient, crypto });

    await expect(getToken(validConfig)).resolves.toEqual({
      access_token: "abc123",
    });
  });

  it("throws if config is missing fields", async () => {
    const invalidConfig = {
      iss: "",
      sub: "",
      aud: BASE_URL,
      key: VALID_KEY,
      expMinutes: 30,
    };

    await expect(getToken(invalidConfig)).rejects.toThrow(
      SalesforceParameterValidationException,
    );
  });

  it("throws if JWT signing fails", async () => {
    const invalidConfig = {
      iss: "abc",
      sub: "def",
      aud: BASE_URL,
      key: "invalid-key",
      expMinutes: 30,
    };

    await expect(getToken(invalidConfig)).rejects.toThrow(
      SalesforceSignatureException,
    );
  });

  it("throws if response lacks access_token", async () => {
    const mockClient = vi.fn(() => ({
      post: vi.fn().mockResolvedValue(new Response(JSON.stringify({}))),
    })) as unknown as HttpClient;

    const getToken = createGetToken({ httpClient: mockClient, crypto });
    const validConfig = {
      iss: "abc",
      sub: "def",
      aud: BASE_URL,
      key: VALID_KEY,
      expMinutes: 30,
    };

    await expect(getToken(validConfig)).rejects.toThrow(
      SalesforceTokenResponseException,
    );
  });

  it("throws if request failed", async () => {
    const response = new Response(JSON.stringify({ error: "fail" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    const request = new Request("https://example.com/token");

    const mockClient = vi.fn(() => ({
      post: vi
        .fn()
        .mockRejectedValue(
          new HTTPError(response, request, {} as NormalizedOptions),
        ),
    })) as unknown as HttpClient;

    const getToken = createGetToken({ httpClient: mockClient, crypto });
    const validConfig = {
      iss: "abc",
      sub: "def",
      aud: BASE_URL,
      key: VALID_KEY,
      expMinutes: 30,
    };

    await expect(getToken(validConfig)).rejects.toThrow(
      SalesforceTokenRequestException,
    );
  });
});
