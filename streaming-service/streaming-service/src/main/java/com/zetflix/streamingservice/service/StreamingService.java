package com.zetflix.streamingservice.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.zetflix.streamingservice.dto.StreamingResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

@Service
@RequiredArgsConstructor
@Slf4j
public class StreamingService {

    private final S3Client s3Client; 
    private final S3Presigner s3Presigner;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.presigned-url-expiry}")
    private long presignedUrlExpiry;

    // Redis key for Caching streaming URLs
    private static final String STREAMING_URL_CACHE_PREFIX = "streaming:url";

    /**
     * GET Streaming URL for a movie
     * 
     * FLOW:
     * 1. Check the redis Cache for existing presigned URl
     * 2. If Cached - return immedietly
     * 3. If not Cached = generate new presigned URL from s3
     * 4. Cache the URL in Redis for future requests
     * 5. Return Streaming URL
     * 
     * Why presigned URL?
     *  - S3 bucket is private locker room - Videos are not publicly accessible
     *  - Presigned URl gives temporary access (X minutes)
     * 
     * GET /api/v1/stream/{movieId}
     * @param movieId
     * @return StreamingResponse
     */

    public StreamingResponse getStreamingURL(String movieId, String playlistKey){
        log.info("Getting streaming URL for movie : {}", movieId);

        String cacheKey = STREAMING_URL_CACHE_PREFIX + movieId;

        // Check redis cache for existing presigned URL
        String cachedUrl = redisTemplate.opsForValue().get(cacheKey);
        if (cachedUrl != null) {
            log.info("Streaming URL found in cache for movie : {}", movieId);
            return new StreamingResponse(movieId, cachedUrl, "1080, 720, 480, 360", presignedUrlExpiry);
        }

        // Generate new presigned URL from S3
        String presignedUrl = generatePresignedUrl(playlistKey);

        // Cache the URL in Redis for 55 minutes
        // (5 minutes less that actual expiry to avoid edge cases)

        redisTemplate.opsForValue().set(
            cacheKey,
            presignedUrl,
            55,
            TimeUnit.MINUTES);
        
        log.info("Streaming URL generated and cached for movie : {}", movieId);

        return new StreamingResponse(
            movieId,
            presignedUrl,
            "1080, 720, 480, 360",
            presignedUrlExpiry
        );

    }

    /**
     * THIS is the KEY METHOD that makes EVERYTHING SECURE
     * 
     * @param movieId
     * @param playlistPath
     * @return
     */

    public String getSignedPlaylist(String movieId, String playlistPath){
        
        // GET base path for this playlist
        String basePath = playlistPath.substring(0, playlistPath.lastIndexOf('/') + 1);

        // READ m3u8 content from S3
        String m3u8Content = readFromS3(playlistPath);

        // Rewrite each line theat is a segment or playlist reference
        String signedContent = rewriteM3u8SignedUrls(
            m3u8Content, basePath
        );

        return signedContent;
    }

    private String rewriteM3u8SignedUrls(String m3u8Content, String basePath){
        StringBuilder rewritten = new StringBuilder();

        for(String line : m3u8Content.split("\n")){
            String trimmed = line.trim();

            // Skip empty lines and comments 
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                rewritten.append(line).append("\n");
                continue;
            }

            // This is a segment or playlist reference
            // Build full S3 key and Sign it 

            String fullKey = basePath + trimmed;
            String signedUrl = generatePresignedUrl(fullKey);

            rewritten.append(signedUrl).append("\n");
        }   
        return rewritten.toString();
    }

    /**
     * READ File content from S3
     * 
     * @param playlistKey
     * @return
     */

    private String readFromS3(String s3Key) {
        GetObjectRequest request = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(s3Key)
            .build();

        ResponseInputStream<GetObjectResponse> response = 
            s3Client.getObject(request);

        return new BufferedReader(new InputStreamReader(response))
            .lines()
            .collect(Collectors.joining("\n"));
    }

    /**
     * Generate presigned URL for S3 object
     * URL Expires after configured time (default 60 minutes).
     * 
     * 
     * @param playlistKey
     * @return presigned URL
     */


    private String generatePresignedUrl(String playlistKey) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(playlistKey)
            .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(presignedUrlExpiry))        
            .getObjectRequest(getObjectRequest)
            .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    /**
     * Invalidate Cache streaming URL 
     * Called when video is re-encoded or updated
     */

    public void invalidateCache(String movieId){
        String cacheKey = STREAMING_URL_CACHE_PREFIX + movieId;
        redisTemplate.delete(cacheKey);
        log.info("Streaming URL cache invalidated for movie : {}", movieId);
    }

}
