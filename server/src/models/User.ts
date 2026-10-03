import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IUserPreferences {
  topics: string[];
  frequency: 'realtime' | 'daily' | 'weekly';
  alertThreshold: 'all' | 'high' | 'critical';
  timezone: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;         // undefined for OAuth-only users
  googleId?: string;             // Google OAuth ID
  preferences: IUserPreferences;
  refreshTokenHash?: string;     // null = no active session
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    topics: { type: [String], default: [] },
    frequency: {
      type: String,
      enum: ['realtime', 'daily', 'weekly'],
      default: 'daily',
    },
    alertThreshold: {
      type: String,
      enum: ['all', 'high', 'critical'],
      default: 'high',
    },
    timezone: { type: String, default: 'UTC' },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    passwordHash: { type: String, select: false },    // excluded from all queries by default
    googleId: { type: String, sparse: true },
    preferences: { type: userPreferencesSchema, default: () => ({}) },
    refreshTokenHash: { type: String, select: false }, // excluded from all queries by default
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['passwordHash'];
        delete ret['refreshTokenHash'];
        delete ret['__v'];
        return ret;
      },
    },
  },
);

// Note: email unique index and googleId sparse index are created automatically
// by Mongoose from the field-level declarations above. No duplicate .index() needed.

// ─── Model ────────────────────────────────────────────────────────────────────

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
