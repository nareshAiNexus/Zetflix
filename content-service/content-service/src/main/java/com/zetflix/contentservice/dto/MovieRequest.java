package com.zetflix.contentservice.dto;

import com.zetflix.contentservice.model.Genre;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovieRequest {

    @NotBlank(message="Title is required")
    private String title;

    private String description;

    private String id;

    @NotBlank(message="Genre is required")
    private Genre genre;

    private String director;

    private String cast;

    private int releaseYear;

    private double rating;

    private String thumbnailUrl;

    private int durationMinutes;

    // S3 Key for the video file
    private String videoKey;

    // HLS master playlist URL for streaming 
    private String hlsURL;
}
