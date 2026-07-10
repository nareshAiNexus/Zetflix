package com.zetflix.contentservice.security;

import com.auth0.jwt.interfaces.DecodedJWT;

public class UserContext {
    private static final ThreadLocal<DecodedJWT> context = new ThreadLocal<>();

    public static void set(DecodedJWT jwt) {
        context.set(jwt);
    }

    public static DecodedJWT get() {
        return context.get();
    }

    public static void clear() {
        context.remove();
    }

    public static String getUserId() {
        DecodedJWT jwt = get();
        return jwt != null ? jwt.getClaim("userId").asString() : null;
    }

    public static String getEmail() {
        DecodedJWT jwt = get();
        return jwt != null ? jwt.getSubject() : null;
    }

    public static String getRole() {
        DecodedJWT jwt = get();
        return jwt != null ? jwt.getClaim("role").asString() : null;
    }
}
