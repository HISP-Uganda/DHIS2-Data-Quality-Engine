"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateEncryptionKey = generateEncryptionKey;
exports.isEncrypted = isEncrypted;
exports.ensureEncrypted = ensureEncrypted;
exports.ensureDecrypted = ensureDecrypted;
const crypto_1 = __importDefault(require("crypto"));
// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
// Get encryption key from environment or generate one
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        console.warn('[Encryption] ENCRYPTION_KEY not set in environment. Using temporary key. ' +
            'Set ENCRYPTION_KEY in .env for production!');
        // Generate a temporary key (NOT for production)
        return crypto_1.default.randomBytes(KEY_LENGTH);
    }
    // Derive a 32-byte key from the environment variable
    return crypto_1.default.scryptSync(key, 'salt', KEY_LENGTH);
}
/**
 * Encrypt a string value
 * Returns: base64 encoded string in format: iv:authTag:encryptedData
 */
function encrypt(plainText) {
    try {
        const key = getEncryptionKey();
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        // Combine iv, authTag, and encrypted data
        const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        return Buffer.from(combined).toString('base64');
    }
    catch (error) {
        console.error('[Encryption] Failed to encrypt:', error);
        throw new Error('Encryption failed');
    }
}
/**
 * Decrypt an encrypted string
 * Input: base64 encoded string in format: iv:authTag:encryptedData
 */
function decrypt(encryptedText) {
    try {
        const key = getEncryptionKey();
        // Decode from base64
        const combined = Buffer.from(encryptedText, 'base64').toString('utf8');
        const parts = combined.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('[Encryption] Failed to decrypt:', error);
        throw new Error('Decryption failed');
    }
}
/**
 * Hash a password using bcrypt (for user passwords, not API credentials)
 */
async function hashPassword(password) {
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}
/**
 * Verify a password against a hash
 */
async function verifyPassword(password, hash) {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
}
/**
 * Generate a secure encryption key
 * Use this to generate ENCRYPTION_KEY for .env file
 */
function generateEncryptionKey() {
    return crypto_1.default.randomBytes(KEY_LENGTH).toString('hex');
}
/**
 * Check if a string is encrypted
 */
function isEncrypted(value) {
    try {
        // Try to decode from base64 and check format
        const decoded = Buffer.from(value, 'base64').toString('utf8');
        const parts = decoded.split(':');
        return parts.length === 3;
    }
    catch {
        return false;
    }
}
// For backward compatibility: encrypt plain text passwords in existing configs
function ensureEncrypted(value) {
    if (!value)
        return value;
    if (isEncrypted(value))
        return value;
    return encrypt(value);
}
// For backward compatibility: decrypt if encrypted, return as-is if plain
function ensureDecrypted(value) {
    if (!value)
        return value;
    if (!isEncrypted(value))
        return value;
    return decrypt(value);
}
