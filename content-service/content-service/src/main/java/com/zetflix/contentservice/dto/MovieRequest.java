package com.zetflix.contentservice.dto;

import com.zetflix.contentservice.model.Genre;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovieRequest {

    @NotNull(message="Title is required")
    private String title;

    private String description;

    private String id;

    @NotNull(message="Genre is required")
    private Genre genre;

    private String director;

    private String cast;

    @NotNull(message="Release year is required")
    private Integer releaseYear;

    @NotNull(message = "Rating is required")
    private Double rating;

    private String thumbnailUrl;

    @NotNull(message = "Duration is required")
    private Integer durationMinutes;

    // S3 Key for the video file
    private String videoKey;

    // HLS master playlist URL for streaming 
    private String hlsURL;
}
