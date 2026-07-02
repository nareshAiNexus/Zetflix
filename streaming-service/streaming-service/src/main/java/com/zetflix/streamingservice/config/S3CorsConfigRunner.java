package com.zetflix.streamingservice.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CORSConfiguration;
import software.amazon.awssdk.services.s3.model.CORSRule;
import software.amazon.awssdk.services.s3.model.PutBucketCorsRequest;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;

@Component
@RequiredArgsConstructor
@Slf4j
public class S3CorsConfigRunner implements CommandLineRunner {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Override
    public void run(String... args) throws Exception {
        log.info("Checking and setting CORS configuration for S3 bucket: {}", bucketName);
        try {
            CORSRule rule = CORSRule.builder()
                    .allowedHeaders(Arrays.asList("*"))
                    .allowedMethods(Arrays.asList("GET", "HEAD"))
                    .allowedOrigins(Arrays.asList("*"))
                    .maxAgeSeconds(3000)
                    .build();

            CORSConfiguration configuration = CORSConfiguration.builder()
                    .corsRules(Arrays.asList(rule))
                    .build();

            PutBucketCorsRequest putBucketCorsRequest = PutBucketCorsRequest.builder()
                    .bucket(bucketName)
                    .corsConfiguration(configuration)
                    .build();

            s3Client.putBucketCors(putBucketCorsRequest);
            log.info("Successfully updated CORS configuration for S3 bucket: {}", bucketName);
        } catch (Exception e) {
            log.error("Failed to set CORS configuration on S3 bucket. You may need to set it manually in the AWS Console. Error: {}", e.getMessage());
        }
    }
}
