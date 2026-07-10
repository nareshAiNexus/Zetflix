package com.zetflix.contentservice.security;

import java.io.IOException;
import org.springframework.stereotype.Component;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class AuthFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Set CORS headers for all responses (including security error blocks)
        httpResponse.setHeader("Access-Control-Allow-Origin", "*");
        httpResponse.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
        httpResponse.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, X-Requested-With");

        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();

        // 1. Handle CORS preflight requests directly
        if ("OPTIONS".equalsIgnoreCase(method)) {
            httpResponse.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        // 2. Bypass public auth and actuator endpoints
        if (path.startsWith("/api/v1/auth") || path.startsWith("/actuator") || path.startsWith("/error")) {
            chain.doFilter(request, response);
            return;
        }

        // 3. Allow unauthenticated GET requests for movie listing and individual movie lookups
        //    but NOT watch-progress which needs the JWT to identify the user
        boolean isPublicGet = "GET".equalsIgnoreCase(method) &&
            (path.startsWith("/api/v1/movies") || path.startsWith("/api/v1/stream")) &&
            !path.endsWith("/watch-progress");
        if (isPublicGet) {
            chain.doFilter(request, response);
            return;
        }

        // 3. Extract and verify JWT
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResponse.getWriter().write("Unauthorized: Missing or invalid token header");
            return;
        }

        String token = authHeader.substring(7);
        DecodedJWT decodedJWT = JwtUtils.verifyToken(token);
        if (decodedJWT == null) {
            httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResponse.getWriter().write("Unauthorized: Invalid or expired token");
            return;
        }

        // 4. Set security context
        UserContext.set(decodedJWT);

        try {
            // 5. Enforce Admin restriction on POST /api/v1/movies
            if (path.equals("/api/v1/movies") && "POST".equalsIgnoreCase(method)) {
                String role = UserContext.getRole();
                if (!"ADMIN".equalsIgnoreCase(role)) {
                    log.warn("Unauthorized attempt to create movie metadata by user: {}", UserContext.getEmail());
                    httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    httpResponse.getWriter().write("Forbidden: Admin privileges required to add movie metadata");
                    return;
                }
            }

            chain.doFilter(request, response);
        } finally {
            // Clear context after request processing to prevent thread-local memory leak
            UserContext.clear();
        }
    }
}
