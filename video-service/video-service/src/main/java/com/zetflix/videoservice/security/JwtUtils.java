package com.zetflix.videoservice.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;

public class JwtUtils {

    private static final String SECRET_KEY = "ZetflixSuperSecretKeyForJWTAuthTokenSigningAndValidationAndSecurityVerificationsServiceOnly";
    private static final String ISSUER = "zetflix-auth-service";

    public static DecodedJWT verifyToken(String token) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(SECRET_KEY);
            JWTVerifier verifier = JWT.require(algorithm)
                    .withIssuer(ISSUER)
                    .build();
            return verifier.verify(token);
        } catch (Exception e) {
            return null;
        }
    }
}
