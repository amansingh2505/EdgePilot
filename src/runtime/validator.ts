import { JSONValue } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors?: any;
}

export interface Validator {
  validate(schema: object | undefined, data: any): ValidationResult;
}

// Try to load Ajv at runtime; if not present, fall back to permissive validator.
export class AjvOptionalValidator implements Validator {
  private ajv: any | null = null;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ajv = require('ajv');
      this.ajv = new Ajv();
    } catch (e) {
      // Ajv not available; runtime will bypass strict validation
      this.ajv = null;
    }
  }

  validate(schema: object | undefined, data: any): ValidationResult {
    if (!schema) return { valid: true };
    if (!this.ajv) {
      // permissive fallback — accept everything but provide a warning
      return { valid: true, errors: ["ajv-not-installed: schema validation skipped"] };
    }
    try {
      const validate = this.ajv.compile(schema);
      const valid = validate(data);
      return { valid: Boolean(valid), errors: validate.errors };
    } catch (e) {
      return { valid: false, errors: e };
    }
  }
}
