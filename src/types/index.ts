import { Request } from 'express';

export interface Item {
    _id?: string;
    title: string;
    shortDescription: string;
    fullDescription: string;
    category: string;
    price: number;
    imageUrl: string;
    sellerEmail: string;
    sellerName: string;
    avgRating: number;
    totalReviews: number;
    tags?: string[];
    createdAt: Date;
}

export interface Review {
    _id?: string;
    itemId: string;
    reviewerEmail: string;
    reviewerName: string;
    reviewerAvatar?: string;
    rating: number;
    comment: string;
    createdAt: Date;
}

export interface User {
    _id?: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    image?: string;
    createdAt: Date;
}

export interface JwtPayload {
    email?: string;
    sub?: string;
    name?: string;
    iat?: number;
    exp?: number;
    [key: string]: unknown;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}
