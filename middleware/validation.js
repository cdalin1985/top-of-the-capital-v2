/**
 * Input Validation Middleware
 * Provides consistent request validation across the API
 */

const { ValidationError } = require('./error-handler');

class ValidationMiddleware {
  /**
   * Generic validation middleware factory
   */
  static validate(schema, property = 'body') {
    return (req, res, next) => {
      const data = req[property];
      const result = ValidationMiddleware.validateData(data, schema);

      if (!result.isValid) {
        throw new ValidationError('Validation failed', result.errors);
      }

      // Store validated data
      req.validatedData = result.data;
      next();
    };
  }

  /**
   * Helper to check if a value is empty
   */
  static _isEmpty(value) {
    return value === undefined || value === null || value === '';
  }

  /**
   * Helper to validate required fields
   */
  static _validateRequired(value, field, rules) {
    if (rules.required && this._isEmpty(value)) {
      return [`${field} is required`];
    }
    return [];
  }

  /**
   * Helper to handle default values
   */
  static _handleDefaults(value, field, rules, validatedData) {
    if (this._isEmpty(value)) {
      if (rules.default !== undefined) {
        validatedData[field] = rules.default;
      }
      return true; // Skip further validation
    }
    return false;
  }

  /**
   * Helper to validate string fields
   */
  static _validateString(value, field, rules) {
    const errors = [];
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must not exceed ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }
    return errors;
  }

  /**
   * Helper to validate number fields
   */
  static _validateNumber(value, field, rules) {
    const errors = [];
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must not exceed ${rules.max}`);
      }
      if (rules.integer && !Number.isInteger(value)) {
        errors.push(`${field} must be an integer`);
      }
    }
    return errors;
  }

  /**
   * Helper to validate array fields
   */
  static _validateArray(value, field, rules) {
    const errors = [];
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`${field} must contain at least ${rules.minItems} items`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`${field} must not contain more than ${rules.maxItems} items`);
      }
      if (rules.items && rules.items.type) {
        value.forEach((item, index) => {
          if (!ValidationMiddleware.validateType(item, rules.items.type)) {
            errors.push(`${field}[${index}] must be of type ${rules.items.type}`);
          }
        });
      }
    }
    return errors;
  }

  /**
   * Helper to run custom validation
   */
  static _validateCustom(value, field, rules) {
    const errors = [];
    if (rules.custom && typeof rules.custom === 'function') {
      try {
        const customResult = rules.custom(value);
        if (customResult !== true) {
          errors.push(customResult || `${field} validation failed`);
        }
      } catch (error) {
        errors.push(`${field} validation error: ${error.message}`);
      }
    }
    return errors;
  }

  /**
   * Helper to apply transformations
   */
  static _applyTransform(value, field, rules) {
    if (rules.transform && typeof rules.transform === 'function') {
      try {
        return rules.transform(value);
      } catch (error) {
        throw new Error(`${field} transformation failed: ${error.message}`);
      }
    }
    return value;
  }

  /**
   * Validate a single field
   */
  static _validateField(field, rules, value) {
    const errors = [];

    // Check required fields
    errors.push(...this._validateRequired(value, field, rules));
    if (errors.length > 0) {
      return { errors, value };
    }

    // Type validation
    if (rules.type && !this.validateType(value, rules.type)) {
      errors.push(`${field} must be of type ${rules.type}`);
    }

    // Specific type validations
    errors.push(...this._validateString(value, field, rules));
    errors.push(...this._validateNumber(value, field, rules));
    errors.push(...this._validateArray(value, field, rules));
    errors.push(...this._validateCustom(value, field, rules));

    return { errors, value };
  }

  /**
   * Validate data against schema
   */
  static validateData(data, schema) {
    const errors = [];
    const validatedData = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data?.[field];

      // Handle defaults and empty values
      if (this._handleDefaults(value, field, rules, validatedData)) {
        continue;
      }

      // Validate the field
      const validation = this._validateField(field, rules, value);
      
      if (validation.errors.length === 0) {
        try {
          const processedValue = this._applyTransform(validation.value, field, rules);
          validatedData[field] = processedValue;
        } catch (error) {
          errors.push(error.message);
        }
      } else {
        errors.push(...validation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: validatedData
    };
  }

  /**
   * Helper for basic type validation
   */
  static _validateBasicType(value, type) {
    const basicTypes = {
      'string': () => typeof value === 'string',
      'number': () => typeof value === 'number' && !isNaN(value),
      'boolean': () => typeof value === 'boolean',
      'array': () => Array.isArray(value),
      'object': () => typeof value === 'object' && value !== null && !Array.isArray(value)
    };
    
    return basicTypes[type] ? basicTypes[type]() : null;
  }

  /**
   * Helper for complex type validation
   */
  static _validateComplexType(value, type) {
    switch (type) {
      case 'email':
        return typeof value === 'string' && ValidationMiddleware.emailPattern.test(value);
      case 'date':
        return !isNaN(Date.parse(value));
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return null;
    }
  }

  /**
   * Type validation helper
   */
  static validateType(value, type) {
    // Try basic types first
    const basicResult = this._validateBasicType(value, type);
    if (basicResult !== null) {
      return basicResult;
    }

    // Try complex types
    const complexResult = this._validateComplexType(value, type);
    if (complexResult !== null) {
      return complexResult;
    }

    // Default case for unknown types
    return true;
  }

  /**
   * Common validation patterns
   */
  static get emailPattern() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }

  static get passwordPattern() {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  }

  static get phonePattern() {
    return /^\+?[\d\s\-()]{10,}$/;
  }

  /**
   * Common validation schemas
   */
  static get schemas() {
    return {
      // User registration validation
      userRegistration: {
        email: {
          required: true,
          type: 'email',
          transform: value => value.toLowerCase().trim()
        },
        displayName: {
          required: true,
          type: 'string',
          minLength: 2,
          maxLength: 50,
          transform: value => value.trim()
        },
        password: {
          required: true,
          type: 'string',
          minLength: 8,
          maxLength: 100,
          pattern: ValidationMiddleware.passwordPattern,
          custom: value => {
            if (!/(?=.*[a-z])/.test(value)) {
              return 'Password must contain at least one lowercase letter';
            }
            if (!/(?=.*[A-Z])/.test(value)) {
              return 'Password must contain at least one uppercase letter';
            }
            if (!/(?=.*\d)/.test(value)) {
              return 'Password must contain at least one number';
            }
            return true;
          }
        }
      },

      // User login validation
      userLogin: {
        email: {
          required: true,
          type: 'email',
          transform: value => value.toLowerCase().trim()
        },
        password: {
          required: true,
          type: 'string',
          minLength: 1
        }
      },

      // Profile update validation
      profileUpdate: {
        displayName: {
          required: false,
          type: 'string',
          minLength: 2,
          maxLength: 50,
          transform: value => value?.trim()
        },
        bio: {
          required: false,
          type: 'string',
          maxLength: 500,
          transform: value => value?.trim()
        },
        location: {
          required: false,
          type: 'string',
          maxLength: 100,
          transform: value => value?.trim()
        },
        favoriteGame: {
          required: false,
          type: 'string',
          enum: ['8-ball', '9-ball', '10-ball', 'straight', 'one-pocket', 'bank'],
          transform: value => value?.toLowerCase()
        },
        homeVenue: {
          required: false,
          type: 'string',
          maxLength: 100
        },
        profileVisibility: {
          required: false,
          type: 'string',
          enum: ['public', 'friends', 'private'],
          default: 'public'
        },
        showStats: {
          required: false,
          type: 'boolean',
          default: true
        },
        showLocation: {
          required: false,
          type: 'boolean',
          default: false
        },
        showLastActive: {
          required: false,
          type: 'boolean',
          default: true
        }
      },

      // Challenge creation validation
      challengeCreate: {
        targetUserId: {
          required: true,
          type: 'string',
          minLength: 1
        },
        discipline: {
          required: true,
          type: 'string',
          enum: ['8-ball', '9-ball', '10-ball', 'straight', 'one-pocket', 'bank']
        },
        gamesToWin: {
          required: true,
          type: 'number',
          integer: true,
          min: 1,
          max: 21
        },
        venue: {
          required: false,
          type: 'string',
          maxLength: 100
        },
        scheduledAt: {
          required: false,
          type: 'date',
          custom: value => {
            const date = new Date(value);
            const now = new Date();
            return date > now ? true : 'Scheduled date must be in the future';
          }
        }
      },

      // Match result validation
      matchResult: {
        winnerId: {
          required: true,
          type: 'string'
        },
        scores: {
          required: true,
          type: 'object',
          custom: value => {
            if (!value.player1 || !value.player2) {
              return 'Scores must include both player1 and player2';
            }
            if (typeof value.player1 !== 'number' || typeof value.player2 !== 'number') {
              return 'Scores must be numbers';
            }
            if (value.player1 < 0 || value.player2 < 0) {
              return 'Scores cannot be negative';
            }
            return true;
          }
        }
      },

      // Query parameter validation
      pagination: {
        page: {
          required: false,
          type: 'number',
          integer: true,
          min: 1,
          default: 1,
          transform: value => parseInt(value, 10)
        },
        limit: {
          required: false,
          type: 'number',
          integer: true,
          min: 1,
          max: 100,
          default: 20,
          transform: value => parseInt(value, 10)
        },
        sortBy: {
          required: false,
          type: 'string',
          enum: ['createdAt', 'updatedAt', 'displayName', 'rank'],
          default: 'createdAt'
        },
        sortOrder: {
          required: false,
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc'
        }
      }
    };
  }

  /**
   * Sanitize output data (remove sensitive fields)
   */
  static sanitizeUser(user) {
    if (!user) {
      return null;
    }

    const { password, ...sanitizedUser } = user;

    return sanitizedUser;
  }

  /**
   * Sanitize array of users
   */
  static sanitizeUsers(users) {
    if (!Array.isArray(users)) {
      return users;
    }
    return users.map(user => ValidationMiddleware.sanitizeUser(user));
  }
}

module.exports = ValidationMiddleware;
