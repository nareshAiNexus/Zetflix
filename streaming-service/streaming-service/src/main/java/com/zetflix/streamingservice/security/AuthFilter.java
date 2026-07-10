package com.zetflix.streamingservice.security;

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

@Component
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

        // 2. Bypass actuator or error endpoints
        if (path.startsWith("/actuator") || path.startsWith("/error")) {
            chain.doFilter(request, response);
            return;
        }

        // 3. Authenticate the stream endpoint
        if (path.startsWith("/api/v1/stream")) {
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
        }

        chain.doFilter(request, response);
    }
}
