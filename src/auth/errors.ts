export class SalesforceAuthException extends Error {}

export class SalesforceParameterValidationException extends SalesforceAuthException {
  constructor(message: string) {
    super(message);
    this.name = "SALESFORCE_PARAMETER_VALIDATION_EXCEPTION";
  }
}

export class SalesforceSignatureException extends SalesforceAuthException {
  constructor(message: string) {
    super(message);
    this.name = "SALESFORCE_SIGNATURE_EXCEPTION";
  }
}

export class SalesforceTokenRequestException extends SalesforceAuthException {
  constructor(message: string) {
    super(message);
    this.name = "SALESFORCE_TOKEN_REQUEST_EXCEPTION";
  }
}

export class SalesforceTokenResponseException extends SalesforceAuthException {
  constructor(message: string) {
    super(message);
    this.name = "SALESFORCE_TOKEN_RESPONSE_EXCEPTION";
  }
}
