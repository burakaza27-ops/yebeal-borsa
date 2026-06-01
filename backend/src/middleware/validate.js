import { fromError } from 'zod-validation-error';

/**
 * Express middleware to validate request bodies against a Zod schema.
 * @param {import('zod').ZodSchema} schema 
 */
export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    const validationError = fromError(error);
    res.status(400).json({ error: validationError.toString() });
  }
};

/**
 * Express middleware to validate request query parameters against a Zod schema.
 * @param {import('zod').ZodSchema} schema 
 */
export const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    const validationError = fromError(error);
    res.status(400).json({ error: validationError.toString() });
  }
};
