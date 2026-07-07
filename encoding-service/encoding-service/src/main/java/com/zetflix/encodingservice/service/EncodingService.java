package com.zetflix.encodingservice.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.zetflix.encodingservice.event.VideoEncodedEvent;
import com.zetflix.encodingservice.event.VideoUploadedEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
@Slf4j
@RequiredArgsConstructor
public class EncodingService {

    private final S3Client s3Client;
    private final KafkaTemplate<String, VideoEncodedEvent> kafkaTemplate;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${ffmpeg.path}")
    private String ffmpegPath;


    @Value("${encoding.temp-dir}")
    private String basePath;

    private static final String VIDEO_ENCODED_TOPIC = "video.encoded";

    // Video qualities to encoded
    // Format : resolution , bitrate, height
    private static final List<int[]> VIDEO_QUALITIES = Arrays.asList(
            new int[]{640, 800, 360} // 360p - 800k bitrate
    );

    /**
     * Main Encoding Pipeline Steps 1. Download raw video from S3 2. Encode to
     * multiple qualities using ffmpeg 3. Generate HLS playlist (.m3u8) for each
     * quality 4. Create master playlist 5. Upload all encoded files back to S3
     * 6. Publish VideoEnocoded event to Kafka
     *
     * @param event
     */
    public void encodeVideo(VideoUploadedEvent event) throws InterruptedException {
        String movieId = event.getMovieId();

        // Fetch movie details to check if already encoded and get exact duration
        int durationMinutes = 120; // fallback default
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("http://localhost:8081/api/v1/movies/" + movieId))
                    .GET()
                    .build();
            java.net.http.HttpResponse<String> res = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() == 200) {
                com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(res.body());
                durationMinutes = node.get("durationMinutes").asInt();
                log.info("Fetched movie duration: {} minutes", durationMinutes);

                if (node.has("videoStatus")) {
                    String videoStatus = node.get("videoStatus").asText();
                    if ("READY".equals(videoStatus)) {
                        log.info("Movie {} is already encoded (status: READY). Skipping encoding job.", movieId);
                        return;
                    }
                }
            } else {
                String body = res.body();
                if (res.statusCode() == 404 || (body != null && body.contains("Movie not found"))) {
                    log.warn("Movie {} not found in catalog (status: {}). Skipping encoding job.", movieId, res.statusCode());
                    return;
                }
                throw new RuntimeException("API returned status code: " + res.statusCode());
            }
        } catch (Exception e) {
            log.warn("Failed to fetch movie details: {}", e.getMessage());
        }

        log.info("Starting encoding platform for movie {}", event.getMovieId());

        // 1. Report start of downloading
        reportProgress(movieId, "DOWNLOADING", 0, 0, 0, 100, 0.0, 0.0, 0);

        int estimatedTotalSegments = (durationMinutes * 60) / 10;
        if (estimatedTotalSegments <= 0) {
            estimatedTotalSegments = 100; // fallback
        }

        // Create an unique path for a movie
        String jobPath = basePath + "/" + movieId;
        long startTime = System.currentTimeMillis();

        // Start scheduler to report real-time transcoding progress
        java.util.concurrent.ScheduledExecutorService scheduler = java.util.concurrent.Executors.newSingleThreadScheduledExecutor();
        final int finalTotalSegments = estimatedTotalSegments;

        try {
            // Create temp directories
            Files.createDirectories(Paths.get(jobPath));
            Files.createDirectories(Paths.get(jobPath + "/encoded"));

            // Step 1: Download raw video from S3
            String localVideoPath = jobPath + "/raw_video.mp4";
            downloadFromS3(event.getVideoKey(), localVideoPath);
            log.info("Raw video downloaded to : {}", localVideoPath);

            // Schedule transcoding progress reporting
            scheduler.scheduleAtFixedRate(() -> {
                try {
                    java.io.File dir = new java.io.File(jobPath + "/encoded/360p");
                    if (dir.exists() && dir.isDirectory()) {
                        java.io.File[] files = dir.listFiles((d, name) -> name.endsWith(".ts"));
                        int count = (files != null) ? files.length : 0;
                        long elapsed = (System.currentTimeMillis() - startTime) / 1000;
                        int progress = Math.min((count * 100) / finalTotalSegments, 99);

                        // Simulated/Calculated performance metrics for aesthetic dashboard
                        double speed = 1.0 + (Math.sin(elapsed / 15.0) * 0.25) + 0.15;
                        double fps = 24.0 * speed;

                        reportProgress(movieId, "ENCODING", progress, 0, count, finalTotalSegments, speed, fps, elapsed);
                    }
                } catch (Exception e) {
                    // Ignore
                }
            }, 1, 2, java.util.concurrent.TimeUnit.SECONDS);

            // Step 2 & 3 : Encode to multiple qualities + generate HLS
            for (int[] qualities : VIDEO_QUALITIES) {
                int width = qualities[0];
                int bitrate = qualities[1];
                int height = qualities[2];

                String qualityDir = jobPath + "/encoded/" + height + "p";
                Files.createDirectories(Paths.get(qualityDir));

                encodeToHLS(localVideoPath, qualityDir, width, height, bitrate);
                log.info("Encoded {}p successfully", height);
            }

            // Stop transcoding scheduler
            scheduler.shutdown();
            reportProgress(movieId, "ENCODED", 100, 0, finalTotalSegments, finalTotalSegments, 0.0, 0.0, (System.currentTimeMillis() - startTime) / 1000);

            // Step 4 : Generate master playlist
            String masterPlaylistPath = jobPath + "/encoded/master.m3u8";
            generateMasterPlaylist(masterPlaylistPath);
            log.info("Master Playist generated");

            // Step 5 . Upload all resources back to S3
            String encodedPrefix = "encoded/" + movieId + "/";
            uploadEncodedFilesToS3(jobPath + "/encoded", encodedPrefix, movieId, startTime);
            log.info("All encoded files uploaded to S3");

            // Step 6 : Publish Video Encoded Event to Kafka
            String masterPlaylistKey = encodedPrefix + "master.m3u8";
            String hlsUrl = "https://" + bucketName + ".s3.amazonaws.com/" + masterPlaylistKey;

            VideoEncodedEvent encodedEvent = new VideoEncodedEvent(
                    movieId,
                    hlsUrl,
                    masterPlaylistKey,
                    true,
                    null
            );

            kafkaTemplate.send(VIDEO_ENCODED_TOPIC, movieId, encodedEvent);
            log.info("VideoEncodedEvent Published to movie : {}", movieId);

            // Final report of complete state
            reportProgress(movieId, "READY", 100, 100, finalTotalSegments, finalTotalSegments, 0.0, 0.0, (System.currentTimeMillis() - startTime) / 1000);

        } catch (Exception e) {
            log.error("Encoding failed for movie : {} - {} ", movieId, e.getMessage());
            scheduler.shutdown();

            VideoEncodedEvent failureEvent = new VideoEncodedEvent(
                    movieId,
                    null,
                    null,
                    false,
                    e.getMessage()
            );

            kafkaTemplate.send(VIDEO_ENCODED_TOPIC, movieId, failureEvent);
            reportProgress(movieId, "FAILED", 0, 0, 0, 0, 0.0, 0.0, 0);
        } finally {
            cleanupTempFiles(jobPath);
        }
    }

    /**
     * Download files from aws S3 to local path
     */
    private void downloadFromS3(String s3Key, String localPath) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        s3Client.getObject(getObjectRequest, Paths.get(localPath));
    }

    /**
     * Encode video to HLS using FFmpeg.
     *
     * FFmeg command created: - multiple .ts segments files (10 sec each) - A
     * .m3u8 playlist file for this quality
     *
     * @param inputPath
     * @param outputDir
     * @param width
     * @param height
     * @param bitrate
     * @throws IOException
     * @throws InteruptedException
     */
    private void encodeToHLS(String inputPath, String outputDir,
            int width, int height, int bitrate) throws IOException, InterruptedException {
        String playlistPath = outputDir + "/playlist.m3u8";
        String segmentPattern = outputDir + "/segment_%03d.ts";

        // FFmpeg Command for HLS encoding
        List<String> command = Arrays.asList(
                ffmpegPath,
                "-i", inputPath, // Input File
                "-vf", "scale=" + width + ":" + height, // Scale to resolution
                "-c:v", "libx264", // Video Codec
                "-b:v", bitrate + "k", // Video Bitrate
                "-c:a", "aac", // Audio Codec
                "-b:a", "128k", // Audio Bitrate
                "-hls_time", "10", // 10 Second segments
                "-hls_list_size", "0", // Keep all segments
                "-hls_segment_filename", segmentPattern, // segment naming
                "-f", "hls", // output format HLS
                playlistPath // output Playlist
        );

        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);
        processBuilder.inheritIO();
        Process process = processBuilder.start();
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            throw new RuntimeException("FFmpeg encoding failed with exit code : " + exitCode);
        }
    }

    /**
     * Generate master HLS playliist that references all quality playlists This
     * is the file the video player downloads first
     *
     * @param masterPlaylistPath
     * @throws IOException
     */
    private void generateMasterPlaylist(String masterPlaylistPath) throws IOException {
        StringBuilder master = new StringBuilder();
        master.append("#EXTM3U\n");
        master.append("EXT-X-VERSION:3\n\n");

        // Add Each quality to master playlist
        for (int[] q : VIDEO_QUALITIES) {
            int width = q[0];
            int bitrate = q[1];
            int height = q[2];

            master.append("#EXT-X-STREAM-INF:BANDWIDTH=")
                    .append(bitrate * 1000)
                    .append(", RESOLUTION=").append(width).append("x").append(height)
                    .append(", CODECS=\"avc1.42e01e, mp4a.40.2\"\n");
            master.append(height).append("p/playlist.m3u8\n\n");
        }

        Files.writeString(Paths.get(masterPlaylistPath), master.toString());

    }

    /**
     * Upload alll encoded files from local directory back to S3
     */
    private void uploadEncodedFilesToS3(String localDir, String s3Prefix, String movieId, long startTime) {
        File directory = new File(localDir);
        int totalFiles = countTotalFiles(directory);
        java.util.concurrent.atomic.AtomicInteger uploadedCount = new java.util.concurrent.atomic.AtomicInteger(0);
        uploadDirectoryToS3(directory, localDir, s3Prefix, uploadedCount, totalFiles, movieId, startTime);
    }

    private void uploadDirectoryToS3(File dir, String baseDir, String s3Prefix, 
            java.util.concurrent.atomic.AtomicInteger uploadedCount, int totalFiles, String movieId, long startTime) {
        for (File file : dir.listFiles()) {
            if (file.isDirectory()) {
                uploadDirectoryToS3(file, baseDir, s3Prefix, uploadedCount, totalFiles, movieId, startTime);
            } else {
                String relativePath = file.getAbsolutePath()
                        .substring(baseDir.length() + 1)
                        .replace("\\", "/");

                String s3Key = s3Prefix + relativePath;
                String contentType = file.getName().endsWith(".m3u8")
                        ? "application/x-mpegURL"
                        : "video/MP2T";

                PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(s3Key)
                        .contentType(contentType)
                        .build();

                s3Client.putObject(putObjectRequest, RequestBody.fromFile(file));

                int currentUploaded = uploadedCount.incrementAndGet();
                int uploadProgress = (totalFiles > 0) ? (currentUploaded * 100) / totalFiles : 100;
                long elapsed = (System.currentTimeMillis() - startTime) / 1000;

                // Report every 5 files to avoid excessive HTTP requests
                if (currentUploaded % 5 == 0 || currentUploaded == totalFiles) {
                    reportProgress(movieId, "UPLOADING", 100, uploadProgress, currentUploaded, totalFiles, 0.0, 0.0, elapsed);
                }
            }
        }
    }

    private int countTotalFiles(File dir) {
        int count = 0;
        File[] list = dir.listFiles();
        if (list != null) {
            for (File file : list) {
                if (file.isDirectory()) {
                    count += countTotalFiles(file);
                } else {
                    count++;
                }
            }
        }
        return count;
    }

    private void reportProgress(String movieId, String status, int transcodeProgress, int s3UploadProgress,
            int processedSegments, int totalSegments, double speed, double fps, long elapsedSeconds) {
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("movieId", movieId);
            payload.put("status", status);
            payload.put("transcodeProgress", transcodeProgress);
            payload.put("s3UploadProgress", s3UploadProgress);
            payload.put("processedSegments", processedSegments);
            payload.put("totalSegments", totalSegments);
            payload.put("speed", speed > 0 ? String.format("%.2fx", speed) : "0.00x");
            payload.put("fps", Math.round(fps));
            payload.put("elapsedSeconds", elapsedSeconds);

            // Get RAM/Memory usage of JVM to display in realtime dashboard
            Runtime runtime = Runtime.getRuntime();
            long memoryUsageBytes = runtime.totalMemory() - runtime.freeMemory();
            payload.put("memoryUsageMb", memoryUsageBytes / (1024 * 1024));

            String jsonPayload = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload);

            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("http://localhost:8081/api/v1/movies/" + movieId + "/progress"))
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            // Send asynchronously to avoid blocking
            client.sendAsync(request, java.net.http.HttpResponse.BodyHandlers.discarding());
        } catch (Exception e) {
            log.warn("Failed to report progress for movie {}: {}", movieId, e.getMessage());
        }
    }

    /**
     * Cleaned the temp files in S3
     *
     * @param jobPath
     */
    private void cleanupTempFiles(String jobPath) {
        try {
            Path dirPath = Paths.get(jobPath);
            if (Files.exists(dirPath)) {
                Files.walk(dirPath)
                        .sorted(java.util.Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(File::delete);
                log.info("Temp files cleaned up for job: {}", jobPath);
            }
        } catch (IOException e) {
            log.warn("Failed to cleanup temp file : {}", e.getMessage());
        }
    }
}
