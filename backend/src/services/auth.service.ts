import jwt from 'jsonwebtoken';
import axios from 'axios';
import { User, IUser } from '../models/User.js';
import { env } from '../config/env.js';

interface GitHubUser {
    id: number;
    login: string;
    email: string;
    avatar_url: string;
}

interface TokenPayload {
    userId: string;
    email: string;
}

interface GoogleUser {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    picture: string;
}

interface AuthResponse {
    user: Partial<IUser>;
    token: string;
}

export class AuthService {
    generateToken(user: IUser): string {
        const payload: TokenPayload = {
            userId: user._id.toString(),
            email: user.email,
        };

        return jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        });
    }

    verifyToken(token: string): TokenPayload {
        return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    }

    async register(email: string, username: string, password: string): Promise<AuthResponse> {
        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            throw new Error(
                existingUser.email === email
                    ? 'Email already registered'
                    : 'Username already taken'
            );
        }

        // Create user
        const user = await User.create({
            email,
            username,
            password,
            provider: 'local',
        });

        const token = this.generateToken(user);

        return {
            user: {
                _id: user._id,
                email: user.email,
                username: user.username,
                avatarUrl: user.avatarUrl,
                provider: user.provider,
            },
            token,
        };
    }

    async login(email: string, password: string): Promise<AuthResponse> {
        const user = await User.findOne({ email }).select('+password');

        if (!user || !user.password) {
            throw new Error('Invalid credentials');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user);

        return {
            user: {
                _id: user._id,
                email: user.email,
                username: user.username,
                avatarUrl: user.avatarUrl,
                provider: user.provider,
            },
            token,
        };
    }

    async githubAuth(code: string): Promise<AuthResponse> {
        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code,
            },
            {
                headers: { Accept: 'application/json' },
            }
        );

        const accessToken = tokenResponse.data.access_token;

        if (!accessToken) {
            throw new Error('Failed to get GitHub access token');
        }

        // Get user info from GitHub
        const userResponse = await axios.get<GitHubUser>(
            'https://api.github.com/user',
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        const githubUser = userResponse.data;

        // Get user email if not public
        let email = githubUser.email;
        if (!email) {
            const emailResponse = await axios.get(
                'https://api.github.com/user/emails',
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            const primaryEmail = emailResponse.data.find((e: any) => e.primary);
            email = primaryEmail?.email;
        }

        if (!email) {
            throw new Error('Could not get email from GitHub');
        }

        // Find or create user
        let user = await User.findOne({ githubId: githubUser.id.toString() });

        if (!user) {
            // Check if email already exists
            user = await User.findOne({ email });

            if (user) {
                // Link GitHub to existing account
                user.githubId = githubUser.id.toString();
                user.avatarUrl = githubUser.avatar_url;
                await user.save();
            } else {
                // Create new user
                user = await User.create({
                    email,
                    username: githubUser.login,
                    githubId: githubUser.id.toString(),
                    avatarUrl: githubUser.avatar_url,
                    provider: 'github',
                });
            }
        }

        const token = this.generateToken(user);

        return {
            user: {
                _id: user._id,
                email: user.email,
                username: user.username,
                avatarUrl: user.avatarUrl,
                provider: user.provider,
            },
            token,
        };
    }

    async getUserById(userId: string): Promise<IUser | null> {
        return User.findById(userId);
    }
    async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
        await User.findByIdAndUpdate(userId, { avatarUrl });
    }

    async googleAuth(code: string): Promise<AuthResponse> {
        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://oauth2.googleapis.com/token',
            {
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: env.GOOGLE_CALLBACK_URL,
            }
        );

        const { access_token } = tokenResponse.data;

        // Get user info from Google
        const userResponse = await axios.get<GoogleUser>(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
                headers: { Authorization: `Bearer ${access_token}` },
            }
        );

        const googleUser = userResponse.data;

        if (!googleUser.email) {
            throw new Error('Could not get email from Google');
        }

        // Find or create user
        let user = await User.findOne({ googleId: googleUser.id });

        if (!user) {
            // Check if email already exists
            user = await User.findOne({ email: googleUser.email });

            if (user) {
                // Link Google to existing account
                user.googleId = googleUser.id;
                if (!user.avatarUrl) user.avatarUrl = googleUser.picture;
                await user.save();
            } else {
                // Create new user
                user = await User.create({
                    email: googleUser.email,
                    username: googleUser.name.replace(/\s+/g, '_').toLowerCase() + Math.floor(Math.random() * 1000),
                    googleId: googleUser.id,
                    avatarUrl: googleUser.picture,
                    provider: 'google',
                });
            }
        }

        const token = this.generateToken(user);

        return {
            user: {
                _id: user._id,
                email: user.email,
                username: user.username,
                avatarUrl: user.avatarUrl,
                provider: user.provider,
            },
            token,
        };
    }
}

export const authService = new AuthService();
